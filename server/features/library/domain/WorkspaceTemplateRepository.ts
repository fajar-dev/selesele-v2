import type { PageTemplate } from '../../../../shared/kernel/library'

export interface WorkspaceTemplate extends PageTemplate {
  workspaceId: string
  sourcePageId: string
}
export interface WorkspaceTemplateRepository {
  list(workspaceId: string): Promise<WorkspaceTemplate[]>
  find(workspaceId: string, id: string): Promise<WorkspaceTemplate | null>
  save(template: Omit<WorkspaceTemplate, 'id'>): Promise<WorkspaceTemplate>
  remove(workspaceId: string, id: string): Promise<void>
}
