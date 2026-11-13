export type AccessLevel = 'none' | 'view' | 'comment' | 'edit'
export type ResourceKind = 'folder' | 'page'
export type ResourceMode = 'inherit' | 'restricted'
export const accessRank: Record<AccessLevel, number> = { none: 0, view: 1, comment: 2, edit: 3 }
export const accessLevels: AccessLevel[] = ['none', 'view', 'comment', 'edit']
export interface AccessGrant {
  id: string
  memberId: string | null
  groupId: string | null
  level: AccessLevel
  expiresAt: string | null
}
export interface ResourcePolicy {
  kind: ResourceKind
  id: string
  workspaceId: string
  title: string
  mode: ResourceMode
  grants: AccessGrant[]
}
export interface MemberResourceAccess {
  kind: ResourceKind
  id: string
  title: string
  folderId: string | null
  mode: ResourceMode
  level: AccessLevel
  source: 'owner' | 'suspended' | 'direct' | 'group' | 'inherited' | 'restricted' | 'parent'
  direct: AccessGrant | null
  parentLevel: AccessLevel
  canManage: boolean
}
export interface MoveImpact {
  token: string
  changes: {
    memberId: string
    name: string
    before: AccessLevel
    after: AccessLevel
  }[]
  canPreviewNames: boolean
}
