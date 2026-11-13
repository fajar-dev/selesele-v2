export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type InviteRole = Exclude<WorkspaceRole, 'owner'>
