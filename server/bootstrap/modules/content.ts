import { MySqlCanvasPresenceRepository } from '../../features/realtime/infrastructure/MySqlCanvasPresenceRepository'
import { CanvasService } from '../../features/canvases/application/CanvasService'
import { MySqlCanvasRepository } from '../../features/canvases/infrastructure/MySqlCanvasRepository'
import { ZodCanvasCodec } from '../../features/canvases/infrastructure/ZodCanvasCodec'
import { CommentService } from '../../features/comments/application/CommentService'
import { MySqlCommentRepository } from '../../features/comments/infrastructure/MySqlCommentRepository'
import { MySqlDocumentRepository } from '../../features/items/infrastructure/MySqlDocumentRepository'
import { ItemContentService } from '../../features/items/application/ItemContentService'
import { CollaborationHub } from '../../platform/collaboration/CollaborationHub'
import { MySqlImageAuthorization } from '../../features/media/infrastructure/MySqlImageAuthorization'
import { ImageService } from '../../features/media/application/ImageService'
import type { RuntimeModule } from './runtime'
import type { AuthenticationModule } from './authentication'
import type { WorkspaceModule } from './workspace'
import type { CommunicationModule } from './communication'

export function createContentModule(runtime: RuntimeModule, authentication: AuthenticationModule, workspace: WorkspaceModule, communication: CommunicationModule) {
  const { database, clock, imageStore } = runtime
  const { auth } = authentication
  const { items, workspaceAccess } = workspace
  const { notifications } = communication
  const documents = new MySqlDocumentRepository(database.db, notifications, clock)
  const collaboration = new CollaborationHub(items, auth, documents)
  const canvasRepository = new MySqlCanvasRepository(database.db)
  const canvases = new CanvasService(canvasRepository, items, new ZodCanvasCodec())
  const itemContent = new ItemContentService(items, documents, collaboration, canvasRepository)
  const presence = new MySqlCanvasPresenceRepository(database.db)
  const comments = new CommentService(new MySqlCommentRepository(database.db), items, workspaceAccess, notifications, canvasRepository)
  const images = new ImageService(imageStore, new MySqlImageAuthorization(database.db))
  return { documents, collaboration, canvasRepository, canvases, itemContent, presence, comments, images }
}
export type ContentModule = ReturnType<typeof createContentModule>
