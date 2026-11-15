import { useAuth } from '~/features/authentication/composables/useAuth'
import { useApi } from '~/core/http/useApi'
import type { CanvasPresence } from '#shared/model/presence'

export function useCanvasPresence(itemId: string) {
  const { state: authentication } = useAuth()
  const api = useApi().canvases, members = shallowRef<CanvasPresence[]>([]), sessionId = crypto.randomUUID()
  let timer: ReturnType<typeof setInterval> | undefined, queued: ReturnType<typeof setTimeout> | undefined, stopped = false, busy = false
  let cursor: CanvasPresence['cursor'] = null, selected: string[] = []
  function accept(values: CanvasPresence[]) {
    const users = new Map<string, CanvasPresence>()
    for (const member of values.filter(member => member.userId !== authentication.user?.id && Date.now() - member.updatedAt < 25000)) {
      const previous = users.get(member.userId)
      if (!previous || member.updatedAt > previous.updatedAt) {
        users.set(member.userId, member)
      }
    }
    members.value = [...users.values()]
  }
  async function heartbeat() {
    if (busy || stopped) {
      return
    }
    busy = true
    try {
      const values = (await api.heartbeat(itemId, sessionId, cursor, selected)).data
      if (!stopped) {
        accept(values)
      } else {
        await api.heartbeat(itemId, sessionId, null, [], true)
      }
    } catch { /* Reconnect on the next heartbeat; drafts remain local. */ } finally {
      busy = false
    }
  }
  function update(value: {
    cursor: CanvasPresence['cursor']
    selected: string[]
  }) {
    cursor = value.cursor
    selected = value.selected
    if (!queued) {
      queued = setTimeout(() => {
        queued = undefined
        void heartbeat()
      }, 120)
    }
  }
  useRealtimeEffect(`presence:${itemId}`, { topics: ['presence', 'access', 'members', 'items', 'folders', 'workspaces'] }, async () => {
    if (!stopped) {
      accept((await api.presence(itemId)).data)
    }
  })
  const connected = useNuxtApp().$realtime.connected
  onMounted(() => {
    void heartbeat()
    timer = setInterval(() => {
      void heartbeat()
    }, 10000)
  })
  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(queued)
    clearInterval(timer)
    void api.heartbeat(itemId, sessionId, null, [], true).catch(() => { })
  })
  return { members, connected, update }
}
