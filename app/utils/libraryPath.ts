import type { LibraryEntry } from '#shared/model/library'

export function libraryPath(entry: Pick<LibraryEntry, 'kind' | 'workspaceId' | 'id'>): string {
  const home = `/workspaces/${entry.workspaceId}`
  return entry.kind === 'workspace' ? home : entry.kind === 'folder' ? `${home}?folder=${entry.id}` : `${home}/items/${entry.id}`
}
