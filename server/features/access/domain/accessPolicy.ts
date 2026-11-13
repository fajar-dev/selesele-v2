import type { AccessGrant, AccessLevel, MemberResourceAccess, ResourceMode } from '../../../../shared/kernel/access'
import { accessLevels, accessRank } from '../../../../shared/kernel/access'
import type { WorkspaceRole } from '../../../../shared/kernel/workspace'

export interface PolicySubject {
  id: string
  role: WorkspaceRole
  suspended: boolean
  groupIds: string[]
}
export function resolveResourceAccess(subject: PolicySubject, mode: ResourceMode, grants: AccessGrant[], parent: AccessLevel, now: Date): Pick<MemberResourceAccess, 'level' | 'source' | 'direct'> {
  if (subject.suspended) {
    return { level: 'none', source: 'suspended', direct: null }
  }
  if (subject.role === 'owner') {
    return { level: 'edit', source: 'owner', direct: null }
  }
  const cap = Math.min(accessRank[parent], subject.role === 'viewer' ? 1 : 3)
  const active = grants.filter(grant => !grant.expiresAt || new Date(grant.expiresAt) > now)
  const direct = active.find(grant => grant.memberId === subject.id)
  if (cap === 0) {
    return { level: 'none', source: 'parent', direct: direct ?? null }
  }
  if (direct) {
    return { level: accessLevels[Math.min(cap, accessRank[direct.level])]!, source: 'direct', direct }
  }
  const groups = active.filter(grant => grant.groupId && subject.groupIds.includes(grant.groupId))
  if (groups.length) {
    return { level: accessLevels[Math.min(cap, Math.max(...groups.map(grant => accessRank[grant.level])))]!, source: 'group', direct: null }
  }
  return { level: mode === 'restricted' ? 'none' : accessLevels[cap]!, source: mode === 'restricted' ? 'restricted' : 'inherited', direct: null }
}
