import { describe, expect, test } from 'bun:test'
import { reconcileDraft } from '../../app/core/state/reconcileDraft'
import { defaultWorkspaceSettings } from '../../shared/kernel/workspaceSettings'
import { settingsInputSchema } from '../../shared/validation/workspaceSettings'

describe('independent settings sections', () => {
  test('refresh updates untouched fields and retains unsaved changes from another section', () => {
    const baseline = defaultWorkspaceSettings()
    const draft = structuredClone(baseline)
    draft.permissions.createPages = 'managers'
    const incoming = { ...baseline, trashRetentionDays: 30 as const }
    const merged = reconcileDraft(draft, baseline, incoming)
    expect(merged.permissions.createPages).toBe('managers')
    expect(merged.trashRetentionDays).toBe(30)
    expect(baseline.permissions.createPages).toBe('members')
  })
  test('initial data is detached and a saved draft becomes clean without aliasing the response', () => {
    const incoming = defaultWorkspaceSettings()
    const draft = reconcileDraft(incoming, undefined, incoming)
    draft.permissions.inviteMembers = 'members'
    expect(incoming.permissions.inviteMembers).toBe('managers')
    const saved = structuredClone(draft)
    const next = reconcileDraft(draft, incoming, saved)
    const refreshed = reconcileDraft(next, saved, { ...saved, homePageId: 'page' })
    expect(refreshed.homePageId).toBe('page')
    expect(refreshed.permissions.inviteMembers).toBe('members')
  })
  test('PATCH accepts one settings section and rejects empty, incomplete, and member-management payloads', () => {
    expect(settingsInputSchema.parse({ homePageId: null })).toEqual({ homePageId: null })
    expect(settingsInputSchema.parse({ trashRetentionDays: 7 })).toEqual({ trashRetentionDays: 7 })
    expect(settingsInputSchema.safeParse({}).success).toBe(false)
    expect(settingsInputSchema.safeParse({ role: 'admin' }).success).toBe(false)
    expect(settingsInputSchema.safeParse({ permissions: { createPages: 'managers' } }).success).toBe(false)
  })
})
