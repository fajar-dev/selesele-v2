import { eq } from 'drizzle-orm'
import { ConversationService } from '../features/conversations/application/ConversationService'
import { MySqlConversationRepository } from '../features/conversations/infrastructure/MySqlConversationRepository'
import { MySqlWorkspaceTemplateRepository } from '../features/library/infrastructure/MySqlWorkspaceTemplateRepository'
import { workspaceMembers } from '../platform/database/schema'
import { MySqlResourceAccess } from '../features/access/infrastructure/MySqlResourceAccess'
import { MemberService } from '../features/members/application/MemberService'
import { MySqlMemberRepository } from '../features/members/infrastructure/MySqlMemberRepository'
import { WorkspaceMaintenance } from '../features/settings/infrastructure/WorkspaceMaintenance'
import { WorkspaceSettingsService } from '../features/settings/application/WorkspaceSettingsService'
import { MySqlSettingsRepository } from '../features/settings/infrastructure/MySqlSettingsRepository'
import { MySqlWorkspaceJournal } from '../features/settings/infrastructure/MySqlWorkspaceJournal'
import { BunWorkspaceArchive } from '../features/settings/infrastructure/BunWorkspaceArchive'
import { EmailDeliveryService } from '../features/mail/application/EmailDeliveryService'
import { MySqlEmailOutbox } from '../features/mail/infrastructure/MySqlEmailOutbox'
import { SmtpEmailSender } from '../features/mail/infrastructure/SmtpEmailSender'
import { EmailWorker } from '../features/mail/infrastructure/EmailWorker'
import { mailConfig } from '../features/mail/infrastructure/mailConfig'
import { ConsoleErrorReporter } from '../platform/runtime/ConsoleErrorReporter'
import { LibraryService } from '../features/library/application/LibraryService'
import { TemplateService } from '../features/library/application/TemplateService'
import { MySqlLibraryRepository } from '../features/library/infrastructure/MySqlLibraryRepository'
import { RecoveryService } from '../features/recovery/application/RecoveryService'
import { MySqlRecoveryRepository } from '../features/recovery/infrastructure/MySqlRecoveryRepository'
import { NotificationService } from '../features/notifications/application/NotificationService'
import { MySqlNotificationRepository } from '../features/notifications/infrastructure/MySqlNotificationRepository'
import { InvalidationHub } from '../platform/events/InvalidationHub'
import { WorkspaceQuestionService } from '../features/writing/application/WorkspaceQuestionService'
import { CryptographicTokens } from '../features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../platform/runtime/SystemClock'
import { WorkspaceAccessPolicy } from '../features/workspaces/application/WorkspaceAccessPolicy'
import { CommentService } from '../features/comments/application/CommentService'
import { MySqlCommentRepository } from '../features/comments/infrastructure/MySqlCommentRepository'
import { AuthService } from '../features/identity/application/AuthService'
import { CompletionService } from '../features/writing/application/CompletionService'
import { WorkspaceService } from '../features/workspaces/application/WorkspaceService'
import { FolderService } from '../features/workspaces/application/FolderService'
import { MySqlWorkspaceRepository } from '../features/workspaces/infrastructure/MySqlWorkspaceRepository'
import { MySqlFolderRepository } from '../features/workspaces/infrastructure/MySqlFolderRepository'
import { MySqlDocumentRepository } from '../features/pages/infrastructure/MySqlDocumentRepository'
import { PageService } from '../features/pages/application/PageService'
import { PageDocumentService } from '../features/pages/application/PageDocumentService'
import { GatewayCompletionProvider } from '../features/writing/infrastructure/GatewayCompletionProvider'
import { MicrosoftIdentityProvider } from '../features/identity/infrastructure/MicrosoftIdentityProvider'
import { OAuthService } from '../features/identity/application/OAuthService'
import { CollaborationHub } from '../platform/collaboration/CollaborationHub'
import { createDatabase } from '../platform/database/client'
import { MySqlPageRepository } from '../features/pages/infrastructure/MySqlPageRepository'
import { MySqlSessionRepository } from '../features/identity/infrastructure/MySqlSessionRepository'
import { MySqlUserRepository } from '../features/identity/infrastructure/MySqlUserRepository'
import { resolve } from 'node:path'
import { MySqlImageAuthorization } from '../features/media/infrastructure/MySqlImageAuthorization'
import { ImageService } from '../features/media/application/ImageService'
import { LocalImageStore } from '../features/media/infrastructure/LocalImageStore'

function createContainer() {
  const database = createDatabase()
  const journal = new MySqlWorkspaceJournal(database.db)
  const imageDirectory = resolve(process.env.UPLOAD_DIR || '.data/uploads')
  const imageStore = new LocalImageStore(imageDirectory)
  const clock = new SystemClock()
  const tokens = new CryptographicTokens()
  const pageRepository = new MySqlPageRepository(database.db)
  const auth = new AuthService(new MySqlUserRepository(database.db), new MySqlSessionRepository(database.db), tokens, clock)
  const emailConfig = mailConfig()
  const emailSender = emailConfig ? new SmtpEmailSender(emailConfig) : null
  const emailWorker = emailSender && emailConfig ? new EmailWorker(new EmailDeliveryService(new MySqlEmailOutbox(database.db), emailSender, clock, emailConfig.origin), new ConsoleErrorReporter()) : null
  const notificationEvents = new InvalidationHub()
  const commentEvents = new InvalidationHub()
  const notifications = new NotificationService(new MySqlNotificationRepository(database.db, !!emailConfig), userId => notificationEvents.changed(userId), new ConsoleErrorReporter())
  const recoveryRepository = new MySqlRecoveryRepository(database.db)
  const maintenance = new WorkspaceMaintenance(database.db, recoveryRepository, journal, new ConsoleErrorReporter())
  const documents = new MySqlDocumentRepository(database.db, notifications, clock, id => commentEvents.changed(id))
  const workspaceRepository = new MySqlWorkspaceRepository(database.db)
  const resources = new MySqlResourceAccess(database.db)
  const folderRepository = new MySqlFolderRepository(database.db)
  const workspaceAccess = new WorkspaceAccessPolicy(workspaceRepository)
  const workspaces = new WorkspaceService(workspaceRepository, workspaceAccess, journal)
  const folders = new FolderService(folderRepository, workspaceAccess, journal, resources)
  const pages = new PageService(pageRepository, workspaceAccess, folders, journal, resources)
  const collaboration = new CollaborationHub(pages, auth, documents)
  const provider = new GatewayCompletionProvider({
    baseURL: process.env.AI_BASE_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || ''
  })
  const completions = new CompletionService(provider)
  const library = new LibraryService(new MySqlLibraryRepository(database.db), pages, workspaceAccess)
  const pageDocuments = new PageDocumentService(pages, documents, collaboration)
  const questions = new WorkspaceQuestionService(library, provider)
  return {
    startWorkers: () => {
      emailWorker?.start()
      maintenance.start()
    },
    auth,
    settings: new WorkspaceSettingsService(new MySqlSettingsRepository(database.db), workspaceAccess, pages, new BunWorkspaceArchive(imageStore, imageDirectory)),
    library,
    recovery: new RecoveryService(recoveryRepository, pages, collaboration, workspaceAccess, journal),
    templates: new TemplateService(pages, pageDocuments, new MySqlWorkspaceTemplateRepository(database.db), workspaceAccess, resources),
    conversations: new ConversationService(new MySqlConversationRepository(database.db), workspaceAccess, resources, questions),
    notifications,
    notificationEvents,
    commentEvents,
    questions,
    oauth: new OAuthService(new MicrosoftIdentityProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || '',
      origin: process.env.APP_ORIGIN || ''
    }), auth, tokens, clock),
    workspaces,
    resources,
    async invalidateWorkspace(id: string) {
      await collaboration.revalidateWorkspace(id)
      const members = await database.db.select({ userId: workspaceMembers.userId }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, id))
      for (const member of members) {
        if (member.userId) {
          notificationEvents.changed(member.userId)
        }
      }
    },
    members: new MemberService(new MySqlMemberRepository(database.db, !!emailConfig), workspaceAccess, resources),
    folders,
    pages,
    documents: pageDocuments,
    collaboration,
    completions,
    comments: new CommentService(new MySqlCommentRepository(database.db), pages, workspaceAccess, { async commentsChanged(id) {
      commentEvents.changed(id)
      await collaboration.commentsChanged(id)
    } }, notifications),
    images: new ImageService(imageStore, new MySqlImageAuthorization(database.db)),
    async close(): Promise<void> {
      notificationEvents.close()
      commentEvents.close()
      await maintenance.close()
      await emailWorker?.close()
      emailSender?.close()
      try {
        await collaboration.close()
      } finally {
        await database.close()
      }
    }
  }
}
let container: ReturnType<typeof createContainer> | undefined
export function getContainer() {
  return container ??= createContainer()
}
export async function closeContainer(): Promise<void> {
  try {
    await container?.close()
  } finally {
    container = undefined
  }
}
