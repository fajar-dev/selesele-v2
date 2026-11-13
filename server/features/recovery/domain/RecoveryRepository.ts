import type { TrashItem, TrashKind, PageVersion } from '../../../../shared/kernel/recovery'

export interface RecoveryRepository {
  findTrashed(userId: string, kind: TrashKind, id: string): Promise<TrashItem | null>
  trash(userId: string): Promise<TrashItem[]>
  restore(kind: TrashKind, id: string): Promise<void>
  purge(kind: TrashKind, id: string, expiredBefore?: Date): Promise<boolean>
  versions(pageId: string): Promise<PageVersion[]>
  version(pageId: string, id: string): Promise<string | null>
  checkpoint(pageId: string, userId: string): Promise<void>
}
