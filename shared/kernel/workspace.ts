export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type InviteRole = Exclude<WorkspaceRole, 'owner'>
