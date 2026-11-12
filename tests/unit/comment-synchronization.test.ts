import { describe, expect, test } from 'bun:test'
import { CommentSynchronization } from '../../app/utils/CommentSynchronization'
import type { CommentThreadItem } from '../../shared/types/comment'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await Bun.sleep(2)
  }
  expect(check()).toBe(true)
}

describe('comment synchronization', () => {
  test('coalesces invalidations during an in-flight request without applying an outdated snapshot', async () => {
    const first = deferred<CommentThreadItem[]>()
    const second = deferred<CommentThreadItem[]>()
    const snapshots: CommentThreadItem[][] = []
    let calls = 0
    const sync = new CommentSynchronization(() => ++calls === 1 ? first.promise : second.promise, value => snapshots.push(value), () => {}, () => true)
    try {
      sync.invalidate()
      sync.invalidate()
      sync.invalidate()
      first.resolve([])
      await until(() => calls === 2)
      expect(snapshots).toHaveLength(0)
      const current: CommentThreadItem[] = []
      second.resolve(current)
      await until(() => snapshots.length === 1)
      expect(snapshots[0]).toBe(current)
      await Bun.sleep(15)
      expect(calls).toBe(2)
    } finally {
      sync.dispose()
    }
  })

  test('retries a transient snapshot failure automatically, without polling after success', async () => {
    let calls = 0
    let failures = 0
    let applied = false
    const sync = new CommentSynchronization(async () => {
      if (++calls === 1) {
        throw new Error('Temporary network failure')
      }
      return []
    }, () => {
      applied = true
    }, () => {
      failures++
    }, () => true, 1)
    try {
      sync.invalidate()
      await until(() => applied)
      expect(failures).toBe(1)
      expect(calls).toBe(2)
      await Bun.sleep(15)
      expect(calls).toBe(2)
    } finally {
      sync.dispose()
    }
  })

  test('does not retry denied access or apply a response after disposal', async () => {
    let calls = 0
    let errors = 0
    const denied = new CommentSynchronization(async () => {
      calls++
      throw new Error('Access revoked')
    }, () => {}, () => {
      errors++
    }, () => false, 1)
    denied.invalidate()
    await until(() => errors === 1)
    await Bun.sleep(10)
    expect(calls).toBe(1)
    denied.dispose()
    const pending = deferred<CommentThreadItem[]>()
    let applied = false
    const sync = new CommentSynchronization(() => pending.promise, () => {
      applied = true
    }, () => {}, () => true)
    sync.invalidate()
    sync.dispose()
    pending.resolve([])
    await Bun.sleep(5)
    sync.invalidate()
    expect(applied).toBe(false)
  })
})
