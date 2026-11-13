import { COMMENTS_CHANGED } from '#shared/collaboration/protocol'
import type { Extensions } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { useThrottleFn } from '@vueuse/core'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export interface CollaborationUser {
  name: string
  color: string
  avatar?: string
  clientId?: number
}

interface CollaborationOptions {
  room: string
  user: CollaborationUser
  onCommentsChanged?: () => void
}

function hasUser(state: unknown): state is { user: CollaborationUser } {
  if (!state || typeof state !== 'object' || !('user' in state)) {
    return false
  }
  const user = state.user
  return !!user && typeof user === 'object'
    && 'name' in user && typeof user.name === 'string'
    && 'color' in user && typeof user.color === 'string'
}

export function useEditorCollaboration({ room, user, onCommentsChanged }: CollaborationOptions) {
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  const connectedUsers = ref<CollaborationUser[]>([])
  const extensions = shallowRef<Extensions>([])
  const ready = ref(false)
  let document: Y.Doc | undefined
  let provider: WebsocketProvider | undefined

  const updateUsers = useThrottleFn(() => {
    const states = provider?.awareness.getStates()
    if (!states) {
      return
    }
    connectedUsers.value = [...states.entries()]
      .filter((entry): entry is [number, { user: CollaborationUser }] => hasUser(entry[1]))
      .map(([clientId, state]) => ({ ...state.user, clientId }))
  }, 100)

  function updateUser(profile: CollaborationUser): void {
    provider?.awareness.setLocalStateField('user', profile)
  }

  onMounted(() => {
    document = new Y.Doc()
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    provider = new WebsocketProvider(`${protocol}//${location.host}/collaboration`, room, document, { disableBc: true, connect: false })
    provider.messageHandlers[COMMENTS_CHANGED] = () => onCommentsChanged?.()
    updateUser(user)
    extensions.value = [
      Collaboration.configure({ document }),
      CollaborationCaret.configure({ provider, user })
    ]

    provider.on('sync', (synced: boolean) => {
      if (!synced) {
        return
      }
      onCommentsChanged?.()
      ready.value = true
      connectionError.value = null
    })
    provider.on('status', ({ status }: { status: string }) => {
      isConnected.value = status === 'connected'
      if (isConnected.value) {
        updateUsers()
      }
    })
    provider.on('connection-error', () => {
      connectionError.value = 'Unable to connect. Reconnecting automatically.'
    })
    provider.on('connection-close', (event: CloseEvent | null) => {
      if (event?.code !== 1008) {
        return
      }
      ready.value = false
      void refreshNuxtData()
      connectionError.value = 'Access expired or was revoked. Return home and sign in again.'
      provider?.disconnect()
    })
    provider.awareness.on('change', updateUsers)
    updateUsers()
    provider.connect()
  })

  onScopeDispose(() => {
    provider?.destroy()
    document?.destroy()
  })

  return { ready, isConnected, connectionError, connectedUsers, extensions, updateUser }
}
