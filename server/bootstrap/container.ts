import { CryptographicTokens } from '../features/identity/infrastructure/CryptographicTokens'
import { SystemClock } from '../platform/runtime/SystemClock'
import { WorkspaceAccessPolicy } from '../features/workspaces/application/WorkspaceAccessPolicy'
import { MembershipService } from '../features/workspaces/application/MembershipService'
import { InvitationService } from '../features/workspaces/application/InvitationService'
import { MySqlMembershipRepository } from '../features/workspaces/infrastructure/MySqlMembershipRepository'
import { MySqlInvitationRepository } from '../features/workspaces/infrastructure/MySqlInvitationRepository'
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
import { GoogleCompletionProvider } from '../features/writing/infrastructure/GoogleCompletionProvider'
import { MicrosoftIdentityProvider } from '../features/identity/infrastructure/MicrosoftIdentityProvider'
import { OAuthService } from '../features/identity/application/OAuthService'
import { CollaborationHub } from '../platform/collaboration/CollaborationHub'
import { createDatabase } from '../platform/database/client'
import { MySqlPageRepository } from '../features/pages/infrastructure/MySqlPageRepository'
import { MySqlSessionRepository } from '../features/identity/infrastructure/MySqlSessionRepository'
import { MySqlUserRepository } from '../features/identity/infrastructure/MySqlUserRepository'
import { resolve } from 'node:path'
import { ImageService } from '../features/media/application/ImageService'
import { LocalImageStore } from '../features/media/infrastructure/LocalImageStore'

function createContainer() {
  const database = createDatabase()
  const clock = new SystemClock()
  const tokens = new CryptographicTokens()
  const pageRepository = new MySqlPageRepository(database.db)
  const auth = new AuthService(
    new MySqlUserRepository(database.db),
    new MySqlSessionRepository(database.db), tokens, clock
  )
  const documents = new MySqlDocumentRepository(database.db)
  const workspaceRepository = new MySqlWorkspaceRepository(database.db)
  const memberRepository = new MySqlMembershipRepository(database.db)
  const invitationRepository = new MySqlInvitationRepository(database.db)
  const folderRepository = new MySqlFolderRepository(database.db)
  const workspaceAccess = new WorkspaceAccessPolicy(workspaceRepository)
  const workspaces = new WorkspaceService(workspaceRepository, workspaceAccess)
  const memberships = new MembershipService(memberRepository, workspaceAccess)
  const invitations = new InvitationService(invitationRepository, memberRepository, workspaceAccess)
  const folders = new FolderService(folderRepository, workspaceAccess)
  const pages = new PageService(pageRepository, documents, workspaceAccess, folders)
  const collaboration = new CollaborationHub(pages, auth, documents)
  const completions = new CompletionService(new GoogleCompletionProvider({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-3-flash-preview'
  }))

  return {
    auth,
    oauth: new OAuthService(new MicrosoftIdentityProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || '',
      origin: process.env.APP_ORIGIN || ''
    }), auth, tokens, clock),
    workspaces,
    memberships,
    invitations,
    folders,
    pages,
    collaboration,
    completions,
    comments: new CommentService(new MySqlCommentRepository(database.db), pages, workspaceAccess, collaboration),
    images: new ImageService(new LocalImageStore(resolve(process.env.UPLOAD_DIR || '.data/uploads'))),
    async close(): Promise<void> {
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
