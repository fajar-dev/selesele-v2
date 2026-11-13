import type { KnowledgeAnswer } from './library'

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
  revision: number
}
interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: KnowledgeAnswer['sources']
  createdAt: string
  unavailable?: boolean
}
export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[]
}
