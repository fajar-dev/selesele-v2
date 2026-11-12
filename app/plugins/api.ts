import { LibraryClient } from '~/features/library/api/LibraryClient'
import { RecoveryClient } from '~/features/recovery/api/RecoveryClient'
import { NotificationClient } from '~/features/notifications/api/NotificationClient'
import { MediaClient } from '~/features/editor/api/MediaClient'
import { NuxtApiTransport } from '~/core/http/ApiTransport'
import { AuthClient } from '~/features/auth/api/AuthClient'
import { CommentClient } from '~/features/comments/api/CommentClient'
import { PageClient } from '~/features/pages/api/PageClient'
import { WorkspaceClient } from '~/features/workspaces/api/WorkspaceClient'
import { FolderClient } from '~/features/workspaces/api/FolderClient'
import { MembershipClient } from '~/features/workspaces/api/MembershipClient'
import { InvitationClient } from '~/features/workspaces/api/InvitationClient'

export default defineNuxtPlugin(() => {
  const http = new NuxtApiTransport(useRequestFetch())
  return {
    provide: {
      api: {
        auth: new AuthClient(http),
        library: new LibraryClient(http),
        recovery: new RecoveryClient(http),
        notifications: new NotificationClient(http),
        media: new MediaClient(http),
        comments: new CommentClient(http),
        pages: new PageClient(http),
        workspaces: new WorkspaceClient(http),
        folders: new FolderClient(http),
        memberships: new MembershipClient(http),
        invitations: new InvitationClient(http)
      }
    }
  }
})
