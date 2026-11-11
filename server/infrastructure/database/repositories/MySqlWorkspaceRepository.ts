import { and, asc, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { WorkspaceRepository } from '../../../domain/ports/WorkspaceRepository'
import type { InviteRole } from '../../../../shared/types/workspace'
import type { Database } from '../client'
import { workspaces, workspaceMembers, workspaceInvitations, users } from '../schema'

const invitationColumns = { id: workspaceInvitations.id, workspaceId: workspaceInvitations.workspaceId,
  workspaceName: workspaces.name, email: workspaceInvitations.email, role: workspaceInvitations.role, expiresAt: workspaceInvitations.expiresAt }

export class MySqlWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string) {
    const rows = await this.db.select({ workspace: workspaces, role: workspaceMembers.role }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt))).orderBy(desc(workspaces.updatedAt))
    return rows.map(row => ({ ...row.workspace, role: row.role }))
  }

  async access(id: string, userId: string) {
    const [row] = await this.db.select({ workspace: workspaces, role: workspaceMembers.role }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaces.id, id), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt))).limit(1)
    return row ? { ...row.workspace, role: row.role } : null
  }

  async create(input: { name: string, icon: string }, userId: string) {
    const now = new Date()
    const workspace = { id: uuidv7(), ...input, createdAt: now, updatedAt: now, deletedAt: null }
    await this.db.transaction(async (transaction) => {
      await transaction.insert(workspaces).values(workspace)
      await transaction.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: 'owner' })
    })
    return workspace
  }

  async update(id: string, input: { name?: string, icon?: string }) {
    await this.db.update(workspaces).set({ ...input, updatedAt: new Date() }).where(eq(workspaces.id, id))
  }

  async delete(id: string) {
    await this.db.update(workspaces).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(workspaces.id, id))
  }

  members(id: string) {
    return this.db.select({ userId: users.id, email: users.email, name: users.name, avatar: users.avatar, role: workspaceMembers.role })
      .from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, id)).orderBy(asc(workspaceMembers.joinedAt))
  }

  async changeRole(id: string, userId: string, role: InviteRole) {
    const [result] = await this.db.update(workspaceMembers).set({ role })
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), ne(workspaceMembers.role, 'owner')))
    return result.affectedRows > 0
  }

  async removeMember(id: string, userId: string) {
    const [result] = await this.db.delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), ne(workspaceMembers.role, 'owner')))
    return result.affectedRows > 0
  }

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
