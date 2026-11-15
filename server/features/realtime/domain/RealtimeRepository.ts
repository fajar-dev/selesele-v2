import type { RealtimeTopic } from '../../../../shared/model/realtime'

export interface RealtimeEvent {
  sequence: number
  workspaceId: string | null
  userId: string | null
  topic: RealtimeTopic
}
export interface RealtimeRepository {
  publish(): Promise<void>
  latestSequence(): Promise<number>
  changes(after: number): Promise<RealtimeEvent[]>
  memberships(userIds: string[]): Promise<{ userId: string, workspaceId: string }[]>
  prune(): Promise<void>
}
export interface RealtimeEffects {
  apply(events: RealtimeEvent[]): Promise<void>
}
