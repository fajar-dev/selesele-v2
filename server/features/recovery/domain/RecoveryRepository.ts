import type { TrashItem, TrashKind, ItemVersion } from '../../../../shared/kernel/recovery'

export interface RecoveryRepository {
  findTrashed(userId: string, kind: TrashKind, id: string): Promise<TrashItem | null>
  trash(userId: string): Promise<TrashItem[]>
  restore(kind: TrashKind, id: string): Promise<void>
  purge(kind: TrashKind, id: string, expiredBefore?: Date): Promise<boolean>
  versions(itemId: string): Promise<ItemVersion[]>
  version(itemId: string, id: string): Promise<string | null>
  checkpoint(itemId: string, userId: string): Promise<void>
}
