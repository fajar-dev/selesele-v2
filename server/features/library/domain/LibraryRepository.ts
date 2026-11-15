import type { SearchFilters } from '../../../../shared/model/itemResources'
import type { LibraryEntry, PersonalLibrary, KnowledgeSource } from '../../../../shared/model/library'

export interface LibraryRepository {
  search(userId: string, query: string, workspaceId?: string, filters?: SearchFilters): Promise<LibraryEntry[]>
  personal(userId: string): Promise<PersonalLibrary>
  favorite(userId: string, itemId: string, favorite: boolean): Promise<void>
  visit(userId: string, itemId: string): Promise<void>
  backlinks(userId: string, itemId: string): Promise<LibraryEntry[]>
  context(userId: string, question: string, workspaceId: string): Promise<KnowledgeSource[]>
}
