import type { ConversationDetail, ConversationSummary } from '../../../../shared/kernel/conversation'
import type { KnowledgeAnswer } from '../../../../shared/kernel/library'

export interface ConversationRepository {
  list(workspaceId: string, userId: string): Promise<ConversationSummary[]>
  create(workspaceId: string, userId: string): Promise<ConversationSummary>
  find(workspaceId: string, userId: string, id: string): Promise<ConversationDetail | null>
  rename(workspaceId: string, userId: string, id: string, title: string): Promise<boolean>
  remove(workspaceId: string, userId: string, id: string): Promise<boolean>
  append(workspaceId: string, userId: string, id: string, revision: number, question: string, answer: KnowledgeAnswer): Promise<void>
}
