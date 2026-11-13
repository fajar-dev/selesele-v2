import type { AccessGrant, AccessLevel, ResourceMode } from '../../../../shared/kernel/access'
import type { PolicySubject } from './accessPolicy'
import { resolveResourceAccess } from './accessPolicy'

export function movedItemAccess(subject: PolicySubject, item: {
  mode: ResourceMode
  grants: AccessGrant[]
}, folder: {
  mode: ResourceMode
  grants: AccessGrant[]
} | null, now: Date): AccessLevel {
  const parent = folder ? resolveResourceAccess(subject, folder.mode, folder.grants, 'edit', now).level : 'edit'
  return resolveResourceAccess(subject, item.mode, item.grants, parent, now).level
}
