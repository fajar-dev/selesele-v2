import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { idSchema, invitationInputSchema, memberRoleSchema, pageLocationSchema, contentSchema, pageInputSchema, pageUpdateSchema } from '../../server/http/schemas'
import { ImageStorage } from '../../server/infrastructure/storage/ImageStorage'

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

  test('rejects removed page descriptions on create and update', () => {
    expect(pageInputSchema.safeParse({ title: 'Page', description: 'Removed' }).success).toBe(false)
    expect(pageUpdateSchema.safeParse({ description: null }).success).toBe(false)
    expect(pageUpdateSchema.safeParse({ title: 'Page', description: 'Removed' }).success).toBe(false)
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
  const images = new ImageStorage(directory)
  test('detects file signatures and retrieves a generated image', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWoYAAAAASUVORK5CYII=', 'base64')
    const uploaded = await images.put(png)
    expect(uploaded.url).toStartWith('/images/')
    expect((await images.get(uploaded.pathname)).data).toEqual(png)
  })

  test('rejects scripts, SVG, oversized uploads and path traversal', async () => {
    await expect(images.put(Buffer.from('<svg onload="alert(1)"></svg>'))).rejects.toMatchObject({ statusCode: 400 })
    await expect(images.put(Buffer.alloc(2 * 1024 * 1024 + 1))).rejects.toMatchObject({ statusCode: 400 })
    await expect(images.get('../.env')).rejects.toMatchObject({ statusCode: 404 })
  })
})
