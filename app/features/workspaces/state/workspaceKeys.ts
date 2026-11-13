export const workspaceKeys = {
  directory: 'workspaces:directory',
  folders: (id: string) => `workspaces:${id}:folders`,
  pages: (id: string) => `workspaces:${id}:pages`,
  members: (id: string) => `workspaces:${id}:members`,
  detail: (id: string) => `workspaces:${id}`
} as const
