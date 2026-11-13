export type TrashKind = 'page' | 'folder' | 'workspace'
export interface TrashItem { id: string, kind: TrashKind, title: string, icon: string | null, workspaceName: string, workspaceId: string, deletedAt: string, canPurge: boolean, canRestore: boolean }
export interface PageVersion { id: string, createdAt: string, author: string | null, content?: string }
