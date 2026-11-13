import { describe, expect, test } from 'bun:test'
import { resolveResourceAccess } from '../../server/features/access/domain/accessPolicy'
import { requireMemberManagement } from '../../server/features/members/domain/memberPolicy'
import type { PolicySubject } from '../../server/features/access/domain/accessPolicy'
import type { AccessGrant, AccessLevel } from '../../shared/kernel/access'

const now = new Date('2030-01-01T00:00:00Z')
const subject: PolicySubject = { id: 'member', role: 'member', suspended: false, groupIds: ['team'] }
const grant = (level: AccessLevel, input: Partial<AccessGrant> = {}): AccessGrant => ({ id: 'grant', memberId: 'member', groupId: null, level, expiresAt: null, ...input })
describe('resource access boundaries', () => {
  test('restricted resources require explicit access, including for admins', () => {
    expect(resolveResourceAccess(subject, 'restricted', [], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess({ ...subject, role: 'admin' }, 'restricted', [], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess({ ...subject, role: 'owner' }, 'restricted', [], 'none', now).level).toBe('edit')
  })
  test('a direct denial overrides group access and a direct grant overrides a group denial', () => {
    expect(resolveResourceAccess(subject, 'restricted', [grant('edit', { memberId: null, groupId: 'team' }), grant('none')], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess(subject, 'restricted', [grant('none', { memberId: null, groupId: 'team' }), grant('comment')], 'edit', now).level).toBe('comment')
  })
  test('pages cannot exceed parent access and viewer roles cannot be escalated by grants', () => {
    for (const parent of ['none', 'view', 'comment'] as const) {
      expect(resolveResourceAccess(subject, 'inherit', [grant('edit')], parent, now).level).toBe(parent)
    }
    expect(resolveResourceAccess({ ...subject, role: 'viewer' }, 'restricted', [grant('edit')], 'edit', now).level).toBe('view')
  })
  test('suspension disables all access and expiry is exclusive at its exact boundary', () => {
    expect(resolveResourceAccess({ ...subject, suspended: true }, 'inherit', [grant('edit')], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess(subject, 'restricted', [grant('edit', { expiresAt: now.toISOString() })], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess(subject, 'restricted', [grant('edit', { expiresAt: new Date(now.getTime() + 1).toISOString() })], 'edit', now).level).toBe('edit')
  })
  test('unrelated members and groups do not grant access; multiple group grants choose the highest level', () => {
    expect(resolveResourceAccess(subject, 'restricted', [grant('edit', { memberId: 'someone-else' })], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess(subject, 'restricted', [grant('edit', { memberId: null, groupId: 'other' })], 'edit', now).level).toBe('none')
    expect(resolveResourceAccess({ ...subject, groupIds: ['team', 'other'] }, 'restricted', [grant('view', { memberId: null, groupId: 'team' }), grant('comment', { memberId: null, groupId: 'other' })], 'edit', now).level).toBe('comment')
  })
  test('only owners manage admins and owners cannot be demoted, suspended, or removed', () => {
    expect(() => requireMemberManagement('admin', 'admin')).toThrow()
    expect(() => requireMemberManagement('admin', 'member', 'admin')).toThrow()
    expect(() => requireMemberManagement('owner', 'owner')).toThrow()
    expect(() => requireMemberManagement('member', 'viewer')).toThrow()
    expect(() => requireMemberManagement('owner', 'admin', 'member')).not.toThrow()
    expect(() => requireMemberManagement('admin', 'viewer', 'member')).not.toThrow()
  })
})
