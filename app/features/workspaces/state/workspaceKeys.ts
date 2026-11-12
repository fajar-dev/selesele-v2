export const workspaceKeys = {
  directory: 'workspaces:directory',
  home: 'workspaces:home',
  detail: (id: string) => `workspaces:${id}`,
  invitations: (id: string) => `workspaces:${id}:invitations`
} as const
