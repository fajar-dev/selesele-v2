export const snapshotPolicy = Object.freeze({ limit: 100, intervalMs: 60_000 })

export function needsSnapshot(previous: string | null, current: string, lastSnapshot: Date | null, now: Date, forced: boolean): boolean {
  return previous !== null && previous !== current
    && (forced || lastSnapshot === null || now.getTime() - lastSnapshot.getTime() >= snapshotPolicy.intervalMs)
}
