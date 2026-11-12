import type { KnowledgeSource } from '../../../../shared/kernel/library'

export interface KnowledgeReader { context(userId: string, question: string, workspaceId: string): Promise<KnowledgeSource[]> }
