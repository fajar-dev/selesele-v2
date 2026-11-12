export const workspaceKeys = {
  directory: 'workspaces:directory',
  inbox: 'workspaces:inbox',
  folders: (id: string) => `workspaces:${id}:folders`,
  pages: (id: string) => `workspaces:${id}:pages`,
  members: (id: string) => `workspaces:${id}:members`,
  detail: (id: string) => `workspaces:${id}`,
  invitations: (id: string) => `workspaces:${id}:invitations`
} as const
