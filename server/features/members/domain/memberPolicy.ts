import type { WorkspaceRole, InviteRole } from '../../../../shared/kernel/workspace'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export function requireMemberManagement(actor: WorkspaceRole, target: WorkspaceRole, nextRole?: InviteRole): void {
  if (target === 'owner') {
    throw new ApplicationError('forbidden', 'Transfer ownership to change the owner')
  }
  if (actor !== 'owner' && (actor !== 'admin' || target === 'admin' || nextRole === 'admin')) {
    throw new ApplicationError('forbidden', 'Only the owner can appoint or manage admins')
  }
}
