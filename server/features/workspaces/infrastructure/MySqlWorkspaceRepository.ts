import { defaultWorkspaceSettings } from '../../../../shared/kernel/workspaceSettings'
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { WorkspaceRepository } from '../domain/WorkspaceRepository'
import type { Database } from '../../../platform/database/client'
import { workspaces, workspaceMembers, users } from '../../../platform/database/schema'

export class MySqlWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string) {
    const rows = await this.db.select({ workspace: workspaces, role: workspaceMembers.role, lastActiveAt: workspaceMembers.lastActiveAt }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt), isNull(workspaceMembers.suspendedAt))).orderBy(desc(workspaces.updatedAt))
    return rows.map(row => ({ ...row.workspace, settings: row.workspace.settings ?? defaultWorkspaceSettings(), role: row.role }))
  }

  async access(id: string, userId: string) {
    const [row] = await this.db.select({ workspace: workspaces, role: workspaceMembers.role, lastActiveAt: workspaceMembers.lastActiveAt }).from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaces.id, id), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt), isNull(workspaceMembers.suspendedAt))).limit(1)
    if (row) {
      await this.db.update(workspaceMembers).set({ lastActiveAt: new Date() }).where(and(eq(workspaceMembers.workspaceId, id), eq(workspaceMembers.userId, userId), or(isNull(workspaceMembers.lastActiveAt), lt(workspaceMembers.lastActiveAt, new Date(Date.now() - 300_000)))))
    }
    return row ? { ...row.workspace, settings: row.workspace.settings ?? defaultWorkspaceSettings(), role: row.role } : null
  }

  async create(input: { name: string, icon: string, description?: string }, userId: string) {
    const now = new Date()
    const workspace = { id: uuidv7(), ...input, description: input.description ?? '', createdAt: now, updatedAt: now, deletedAt: null, archivedAt: null, settings: defaultWorkspaceSettings() }
    await this.db.transaction(async (transaction) => {
      await transaction.insert(workspaces).values(workspace)
      const [owner] = await transaction.select({ email: users.email }).from(users).where(eq(users.id, userId))
      await transaction.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, email: owner!.email, role: 'owner' })
    })
    return workspace
  }

  async update(id: string, input: { name?: string, icon?: string, description?: string }) {
    await this.db.update(workspaces).set({ ...input, updatedAt: new Date() }).where(eq(workspaces.id, id))
  }

  async delete(id: string) {
    await this.db.update(workspaces).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(workspaces.id, id))
  }
}
