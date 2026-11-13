import type { LibraryEntry, PersonalLibrary, KnowledgeSource } from '../../../../shared/kernel/library'

export interface LibraryRepository {
  search(userId: string, query: string, workspaceId?: string): Promise<LibraryEntry[]>
  personal(userId: string): Promise<PersonalLibrary>
  favorite(userId: string, itemId: string, favorite: boolean): Promise<void>
  visit(userId: string, itemId: string): Promise<void>
  backlinks(userId: string, itemId: string): Promise<LibraryEntry[]>
  context(userId: string, question: string, workspaceId: string): Promise<KnowledgeSource[]>
}
