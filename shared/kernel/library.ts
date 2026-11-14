import type { ItemKind } from './content'

export interface LibraryEntry {
  id: string
  kind: 'item' | 'folder' | 'workspace'
  workspaceId: string
  title: string
  icon: string | null
  snippet: string
}
export interface PersonalLibrary {
  favorites: LibraryEntry[]
  recent: LibraryEntry[]
}
export interface KnowledgeSource {
  id: string
  workspaceId: string
  title: string
  content: string
}
export interface KnowledgeAnswer {
  answer: string
  sources: (Omit<KnowledgeSource, 'content'> & { excerpt?: string })[]
}
export interface ItemTemplate {
  kind: ItemKind
  id: string
  title: string
  icon: string
  description: string
  content: string
}
export interface WorkspaceTemplateSummary extends Omit<ItemTemplate, 'content'> {
  workspaceId: string
  sourceItemId: string
}
