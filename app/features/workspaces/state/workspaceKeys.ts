export const workspaceKeys = {
  directory: 'workspaces:directory',
  folders: (id: string) => `workspaces:${id}:folders`,
  items: (id: string) => `workspaces:${id}:items`,
  members: (id: string) => `workspaces:${id}:members`,
  detail: (id: string) => `workspaces:${id}`
} as const
