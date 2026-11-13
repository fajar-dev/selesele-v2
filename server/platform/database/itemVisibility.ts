import { and, eq, isNull } from 'drizzle-orm'
import { folders, items, workspaceMembers, workspaces } from './schema'
/** Apply after joining items, workspaces, workspaceMembers and left-joining folders. */
export function itemVisibility(userId: string) {
  return and(eq(workspaceMembers.userId, userId), isNull(workspaceMembers.suspendedAt), isNull(workspaces.deletedAt), isNull(items.deletedAt), isNull(items.archivedAt), isNull(folders.deletedAt))
}
