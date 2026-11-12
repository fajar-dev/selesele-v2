import { CommentService } from './application/CommentService'
import { MySqlCommentRepository } from './infrastructure/database/repositories/MySqlCommentRepository'
import { AuthService } from './application/AuthService'
import { CompletionService } from './application/CompletionService'
import { WorkspaceService } from './application/WorkspaceService'
import { FolderService } from './application/FolderService'
import { MySqlWorkspaceRepository } from './infrastructure/database/repositories/MySqlWorkspaceRepository'
import { MySqlFolderRepository } from './infrastructure/database/repositories/MySqlFolderRepository'
import { MySqlDocumentRepository } from './infrastructure/database/repositories/MySqlDocumentRepository'
import { PageService } from './application/PageService'
import { GoogleCompletionProvider } from './infrastructure/ai/GoogleCompletionProvider'
import { MicrosoftIdentityProvider } from './infrastructure/auth/MicrosoftIdentityProvider'
import { OAuthService } from './application/OAuthService'
import { CollaborationHub } from './infrastructure/collaboration/CollaborationHub'
import { createDatabase } from './infrastructure/database/client'
import { MySqlPageRepository } from './infrastructure/database/repositories/MySqlPageRepository'
import { MySqlSessionRepository } from './infrastructure/database/repositories/MySqlSessionRepository'
import { MySqlUserRepository } from './infrastructure/database/repositories/MySqlUserRepository'
import { ImageStorage } from './infrastructure/storage/ImageStorage'

function createContainer() {
  const database = createDatabase()
  const pageRepository = new MySqlPageRepository(database.db)
  const auth = new AuthService(
    new MySqlUserRepository(database.db),
    new MySqlSessionRepository(database.db)
  )
  const documents = new MySqlDocumentRepository(database.db)
  const workspaces = new WorkspaceService(new MySqlWorkspaceRepository(database.db))
  const folders = new FolderService(new MySqlFolderRepository(database.db), workspaces)
  const pages = new PageService(pageRepository, documents, workspaces, folders)
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
    }), auth),
    workspaces,
    folders,
    pages,
    collaboration,
    completions,
    comments: new CommentService(new MySqlCommentRepository(database.db), pages, workspaces, collaboration),
    images: new ImageStorage(),
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
