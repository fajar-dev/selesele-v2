import type { KnowledgeSource } from '../../../../shared/model/library'

export interface KnowledgeReader { context(userId: string, question: string, workspaceId: string): Promise<KnowledgeSource[]> }
