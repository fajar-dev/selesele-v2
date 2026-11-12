import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { idSchema, invitationInputSchema, memberRoleSchema, workspaceUpdateSchema, folderUpdateSchema } from '../../shared/validation/workspace'
import { pageLocationSchema, contentSchema, pageInputSchema, pageUpdateSchema } from '../../shared/validation/page'
import { ImageService } from '../../server/features/media/application/ImageService'
import { LocalImageStore } from '../../server/features/media/infrastructure/LocalImageStore'

const directory = await mkdtemp(join(tmpdir(), 'sele-images-'))
afterAll(() => rm(directory, { recursive: true, force: true }))

describe('HTTP validation', () => {
  test('rejects invalid identities, owner escalation and location injection', () => {
    expect(idSchema.safeParse('../../.env').success).toBe(false)
    expect(memberRoleSchema.safeParse({ role: 'owner' }).success).toBe(false)
    expect(invitationInputSchema.safeParse({ email: 'person@example.com', role: 'owner' }).success).toBe(false)
    expect(pageLocationSchema.safeParse({ folderId: null, workspaceId: 'injected' }).success).toBe(false)
    expect(pageLocationSchema.parse({ folderId: null })).toEqual({ folderId: null })
    expect(pageUpdateSchema.safeParse({ title: 'Page', workspaceId: 'injected' }).success).toBe(false)
    expect(pageUpdateSchema.safeParse({ folderId: null }).success).toBe(false)
  })

  test('accepts editable descriptions, including clearing, and validates their size', () => {
    expect(pageInputSchema.safeParse({ title: 'Page', description: 'Summary' }).success).toBe(true)
    expect(pageUpdateSchema.safeParse({ description: '' }).success).toBe(true)
    expect(pageUpdateSchema.safeParse({ description: 'x'.repeat(2001) }).success).toBe(false)
    expect(pageUpdateSchema.safeParse({ description: null }).success).toBe(false)
    expect(pageUpdateSchema.safeParse({ title: 'Page', description: 'Summary' }).success).toBe(true)
  })

  test('uses the same icon limits for pages, folders and workspaces without injecting create defaults', () => {
    for (const schema of [pageUpdateSchema, folderUpdateSchema, workspaceUpdateSchema]) {
      expect(schema.parse({ icon: '👩🏽‍💻' })).toEqual({ icon: '👩🏽‍💻' })
      expect(schema.safeParse({ icon: '' }).success).toBe(false)
      expect(schema.safeParse({ icon: 'x'.repeat(33) }).success).toBe(false)
      expect(schema.safeParse({ icon: 42 }).success).toBe(false)
    }
    expect(workspaceUpdateSchema.parse({ name: 'Team' })).toEqual({ name: 'Team' })
    expect(folderUpdateSchema.parse({ icon: null })).toEqual({ icon: null })
  })

  test('normalizes email and accepts clearing nullable page fields and content', () => {
    expect(invitationInputSchema.parse({ email: 'Friend@Example.com' }).email).toBe('friend@example.com')
    expect(invitationInputSchema.safeParse({ email: 'invalid' }).success).toBe(false)
    expect(pageInputSchema.parse({ title: ' Test ', icon: null }).title).toBe('Test')
    expect(contentSchema.parse({ content: '' }).content).toBe('')
    expect(contentSchema.safeParse({ content: {} }).success).toBe(false)
  })
})

describe('image storage', () => {
  const images = new ImageService(new LocalImageStore(directory))
  test('detects file signatures and retrieves a generated image', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWoYAAAAASUVORK5CYII=', 'base64')
    const uploaded = await images.put(png)
    expect(uploaded.url).toStartWith('/images/')
    expect((await images.get(uploaded.pathname)).data).toEqual(png)
  })

  test('rejects scripts, SVG, oversized uploads and path traversal', async () => {
    await expect(images.put(Buffer.from('<svg onload="alert(1)"></svg>'))).rejects.toMatchObject({ code: 'invalid_input' })
    await expect(images.put(Buffer.alloc(2 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'invalid_input' })
    await expect(images.get('../.env')).rejects.toMatchObject({ code: 'not_found' })
  })
})
