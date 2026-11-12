import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { InvitationRepository } from '../domain/InvitationRepository'
import type { InviteRole } from '../../../../shared/kernel/workspace'
import type { Database } from '../../../platform/database/client'
import { workspaces, workspaceInvitations, workspaceMembers } from '../../../platform/database/schema'

const invitationColumns = { id: workspaceInvitations.id, workspaceId: workspaceInvitations.workspaceId,
  workspaceName: workspaces.name, email: workspaceInvitations.email, role: workspaceInvitations.role, expiresAt: workspaceInvitations.expiresAt }

export class MySqlInvitationRepository implements InvitationRepository {
  constructor(private readonly db: Database) {}

  async invite(id: string, email: string, role: InviteRole, invitedBy: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.db.insert(workspaceInvitations).values({ workspaceId: id, email, role, invitedBy, expiresAt })
      .onDuplicateKeyUpdate({ set: { role, invitedBy, expiresAt } })
  }

  invitations(id: string) {
    return this.db.select(invitationColumns).from(workspaceInvitations)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
      .where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt), gt(workspaceInvitations.expiresAt, new Date())))
  }

  inbox(email: string) {
    return this.db.select(invitationColumns).from(workspaceInvitations)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
      .where(and(eq(workspaceInvitations.email, email), isNull(workspaces.deletedAt), gt(workspaceInvitations.expiresAt, new Date())))
  }

  async accept(invitationId: string, userId: string, email: string) {
    return this.db.transaction(async (transaction) => {
      const [invitation] = await transaction.select({ invitation: workspaceInvitations }).from(workspaceInvitations)
        .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
        .where(and(eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.email, email),
          gt(workspaceInvitations.expiresAt, new Date()), isNull(workspaces.deletedAt))).limit(1).for('update')
      if (!invitation) {
        return null
      }
      await transaction.insert(workspaceMembers).values({ workspaceId: invitation.invitation.workspaceId, userId, role: invitation.invitation.role })
        .onDuplicateKeyUpdate({ set: { id: sql`${workspaceMembers.id}` } })
      await transaction.delete(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId))
      return invitation.invitation.workspaceId
    })
  }

  async decline(invitationId: string, email: string) {
    await this.db.delete(workspaceInvitations).where(and(eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.email, email)))
  }

  async cancelInvitation(id: string, invitationId: string) {
    await this.db.delete(workspaceInvitations).where(and(eq(workspaceInvitations.workspaceId, id), eq(workspaceInvitations.id, invitationId)))
  }
}
