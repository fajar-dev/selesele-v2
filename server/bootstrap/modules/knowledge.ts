import { ItemResourceService } from '../../features/resources/application/ItemResourceService'
import { MySqlItemResourceRepository } from '../../features/resources/infrastructure/MySqlItemResourceRepository'
import { MySqlTaskRepository } from '../../features/kanban/infrastructure/MySqlTaskRepository'
import { ConversationService } from '../../features/conversations/application/ConversationService'
import { MySqlConversationRepository } from '../../features/conversations/infrastructure/MySqlConversationRepository'
import { MySqlWorkspaceTemplateRepository } from '../../features/library/infrastructure/MySqlWorkspaceTemplateRepository'
import { WorkspaceSettingsService } from '../../features/settings/application/WorkspaceSettingsService'
import { MySqlSettingsRepository } from '../../features/settings/infrastructure/MySqlSettingsRepository'
import { BunWorkspaceArchive } from '../../features/settings/infrastructure/BunWorkspaceArchive'
import { LibraryService } from '../../features/library/application/LibraryService'
import { TemplateService } from '../../features/library/application/TemplateService'
import { MySqlLibraryRepository } from '../../features/library/infrastructure/MySqlLibraryRepository'
import { RecoveryService } from '../../features/recovery/application/RecoveryService'
import { MySqlRecoveryRepository } from '../../features/recovery/infrastructure/MySqlRecoveryRepository'
import { WorkspaceQuestionService } from '../../features/ai/application/WorkspaceQuestionService'
import { CompletionService } from '../../features/ai/application/CompletionService'
import { GatewayCompletionProvider } from '../../features/ai/infrastructure/GatewayCompletionProvider'
import type { RuntimeModule } from './runtime'
import type { WorkspaceModule } from './workspace'
import type { ContentModule } from './content'

export function createKnowledgeModule(runtime: RuntimeModule, workspace: WorkspaceModule, content: ContentModule) {
  const { database, imageStore, imageDirectory } = runtime
  const { workspaceAccess, items, resources, journal } = workspace
  const { itemContent, collaboration, canvases, canvasRepository } = content
  const provider = new GatewayCompletionProvider({
    baseURL: process.env.AI_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || ''
  })
  const completions = new CompletionService(provider)
  const library = new LibraryService(new MySqlLibraryRepository(database.db), items, workspaceAccess)
  const questions = new WorkspaceQuestionService(library, provider)
  const recoveryRepository = new MySqlRecoveryRepository(database.db)
  const settings = new WorkspaceSettingsService(new MySqlSettingsRepository(database.db), workspaceAccess, items, new BunWorkspaceArchive(imageStore, imageDirectory))
  const myTasks = new MySqlTaskRepository(database.db)
  const itemResources = new ItemResourceService(new MySqlItemResourceRepository(database.db), items, canvasRepository)
  const recovery = new RecoveryService(recoveryRepository, items, collaboration, workspaceAccess, journal, canvases)
  const templates = new TemplateService(items, itemContent, new MySqlWorkspaceTemplateRepository(database.db), workspaceAccess, resources)
  const conversations = new ConversationService(new MySqlConversationRepository(database.db), workspaceAccess, resources, questions)
  return { settings, myTasks, itemResources, recovery, templates, conversations, completions, questions, library, recoveryRepository }
}
export type KnowledgeModule = ReturnType<typeof createKnowledgeModule>
