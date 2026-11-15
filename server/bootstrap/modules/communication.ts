import { NotificationService } from '../../features/notifications/application/NotificationService'
import { MySqlNotificationRepository } from '../../features/notifications/infrastructure/MySqlNotificationRepository'
import type { RuntimeModule } from './runtime'

export function createCommunicationModule(runtime: RuntimeModule) {
  const { database, emailConfig, errors } = runtime
  const notifications = new NotificationService(new MySqlNotificationRepository(database.db, !!emailConfig), errors)

  return { notifications }
}
export type CommunicationModule = ReturnType<typeof createCommunicationModule>
