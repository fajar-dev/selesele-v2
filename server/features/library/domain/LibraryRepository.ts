import type { LibraryEntry, PersonalLibrary, KnowledgeSource } from '../../../../shared/kernel/library'

export interface LibraryRepository {
  search(userId: string, query: string, workspaceId?: string): Promise<LibraryEntry[]>
  personal(userId: string): Promise<PersonalLibrary>
  favorite(userId: string, pageId: string, favorite: boolean): Promise<void>
  visit(userId: string, pageId: string): Promise<void>
  backlinks(userId: string, pageId: string): Promise<LibraryEntry[]>
  context(userId: string, question: string, workspaceId: string): Promise<KnowledgeSource[]>
}
