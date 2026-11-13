import type { ItemTemplate } from '../../../../shared/kernel/library'

export interface WorkspaceTemplate extends ItemTemplate {
  workspaceId: string
  sourceItemId: string
}
export interface WorkspaceTemplateRepository {
  list(workspaceId: string): Promise<WorkspaceTemplate[]>
  find(workspaceId: string, id: string): Promise<WorkspaceTemplate | null>
  save(template: Omit<WorkspaceTemplate, 'id'>): Promise<WorkspaceTemplate>
  remove(workspaceId: string, id: string): Promise<void>
}
