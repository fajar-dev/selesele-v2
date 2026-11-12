export interface LibraryEntry {
  id: string
  kind: 'page' | 'folder' | 'workspace'
  workspaceId: string
  title: string
  icon: string | null
  snippet: string
}
export interface PersonalLibrary { favorites: LibraryEntry[], recent: LibraryEntry[] }
export interface KnowledgeSource { id: string, workspaceId: string, title: string, content: string }
export interface KnowledgeAnswer { answer: string, sources: Omit<KnowledgeSource, 'content'>[] }
export interface PageTemplate { id: string, title: string, icon: string, description: string, content: string }
