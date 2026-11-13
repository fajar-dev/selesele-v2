import type { AccessLevel, ResourceKind, ResourcePolicy, MemberResourceAccess } from '../../../../shared/kernel/access'

export interface ResourceAccess {
  require(kind: ResourceKind, id: string, userId: string, level: AccessLevel): Promise<AccessLevel>
  visible(kind: ResourceKind, workspaceId: string, userId: string): Promise<MemberResourceAccess[]>
  policy(kind: ResourceKind, id: string, userId: string): Promise<ResourcePolicy>
  save(kind: ResourceKind, id: string, userId: string, input: Omit<ResourcePolicy, 'id' | 'kind' | 'workspaceId' | 'title' | 'grants'> & {
    grants: Omit<ResourcePolicy['grants'][number], 'id'>[]
  }): Promise<void>
  memberResources(workspaceId: string, memberId: string, actorId: string): Promise<MemberResourceAccess[]>
  grant(workspaceId: string, memberId: string, actorId: string, input: {
    kind: ResourceKind
    resourceId: string
    level: AccessLevel | null
    expiresAt: string | null
  }): Promise<void>
}
