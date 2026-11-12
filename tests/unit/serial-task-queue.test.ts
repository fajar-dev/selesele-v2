import { expect, test } from 'bun:test'
import { SerialTaskQueue } from '../../app/core/async/SerialTaskQueue'

test('metadata writes run in order and a failed write does not block the next write', async () => {
  const queue = new SerialTaskQueue()
  const events: string[] = []
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const first = queue.run(async () => {
    events.push('first:start')
    await gate
    events.push('first:end')
    throw new Error('Temporary save failure')
  })
  const failure = first.catch(error => error)
  const second = queue.run(async () => {
    events.push('second')
    return 'saved'
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(events).toEqual(['first:start'])
  release()
  expect(await failure).toMatchObject({ message: 'Temporary save failure' })
  expect(await second).toBe('saved')
  expect(events).toEqual(['first:start', 'first:end', 'second'])
})
