import { and, eq } from 'drizzle-orm'
import type { Database } from '../../../platform/database/client'
import { workspaceTemplates } from '../../../platform/database/schema'
import type { WorkspaceTemplate, WorkspaceTemplateRepository } from '../domain/WorkspaceTemplateRepository'

export class MySqlWorkspaceTemplateRepository implements WorkspaceTemplateRepository {
  constructor(private readonly db: Database) { }
  list(workspaceId: string) {
    return this.db.select().from(workspaceTemplates).where(eq(workspaceTemplates.workspaceId, workspaceId))
  }

  async find(workspaceId: string, id: string) {
    return (await this.db.select().from(workspaceTemplates).where(and(eq(workspaceTemplates.workspaceId, workspaceId), eq(workspaceTemplates.id, id))))[0] || null
  }

  async save(template: Omit<WorkspaceTemplate, 'id'>) {
    const value = { ...template, id: crypto.randomUUID() }
    await this.db.insert(workspaceTemplates).values(value)
    return value
  }

  async remove(workspaceId: string, id: string) {
    await this.db.delete(workspaceTemplates).where(and(eq(workspaceTemplates.workspaceId, workspaceId), eq(workspaceTemplates.id, id)))
  }
}
