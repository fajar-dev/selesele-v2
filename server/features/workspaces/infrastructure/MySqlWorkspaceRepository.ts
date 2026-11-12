import { and, desc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { WorkspaceRepository } from '../domain/WorkspaceRepository'
import type { Database } from '../../../platform/database/client'
import { workspaces, workspaceMembers } from '../../../platform/database/schema'

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
}
