import { and, eq, isNull } from 'drizzle-orm'
import { folders, pages, workspaceMembers, workspaces } from './schema'

/** Apply after joining pages, workspaces, workspaceMembers and left-joining folders. */
export function pageVisibility(userId: string) {
  return and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(pages.deletedAt), isNull(folders.deletedAt))
}
