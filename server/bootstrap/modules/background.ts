import { TaskReminderWorker } from '../../features/kanban/infrastructure/TaskReminderWorker'
import { MySqlRealtimeRepository } from '../../features/realtime/infrastructure/MySqlRealtimeRepository'
import { RealtimeService } from '../../features/realtime/application/RealtimeService'
import { CollaborationRealtimeEffects } from '../../features/realtime/infrastructure/CollaborationRealtimeEffects'
import { WorkspaceMaintenance } from '../../features/settings/infrastructure/WorkspaceMaintenance'
import type { RuntimeModule } from './runtime'
import type { WorkspaceModule } from './workspace'
import type { ContentModule } from './content'
import type { KnowledgeModule } from './knowledge'

export function createBackgroundModule(runtime: RuntimeModule, workspace: WorkspaceModule, content: ContentModule, knowledge: KnowledgeModule) {
  const { database, errors } = runtime
  const { journal } = workspace
  const { collaboration } = content
  const { recoveryRepository } = knowledge
  const realtime = new RealtimeService(new MySqlRealtimeRepository(database.db), new CollaborationRealtimeEffects(collaboration), errors)
  const taskReminders = new TaskReminderWorker(database.db, errors)
  const maintenance = new WorkspaceMaintenance(database.db, recoveryRepository, journal, errors)

  return { realtime, taskReminders, maintenance }
}
