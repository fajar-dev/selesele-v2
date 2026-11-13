import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import type { ConversationDetail } from '#shared/contracts/conversation'

export function useConversations(workspaceId: string) {
  const api = useApi().conversations
  const route = useRoute()
  const selected = computed(() => typeof route.query.chat === 'string' ? route.query.chat : null)
  const list = useLazyAsyncData(`conversations:${workspaceId}`, async () => (await api.list(workspaceId)).data, { server: false, default: () => [] })
  const current = shallowRef<ConversationDetail | null>(null)
  const loading = ref(false), busy = ref(false), question = ref(''), pendingQuestion = ref('')
  const toast = useToast()
  let revision = 0, active = true
  onScopeDispose(() => {
    active = false
    revision++
  })
  async function inspect(id: string | null) {
    const request = ++revision
    current.value = null
    question.value = ''
    if (!id) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const value = (await api.get(workspaceId, id)).data
      if (request === revision && active) {
        current.value = value
      }
    } catch (cause) {
      if (request === revision && active) {
        toast.add({ title: 'Unable to load conversation', description: errorMessage(cause), color: 'error' })
      }
    } finally {
      if (request === revision && active) {
        loading.value = false
      }
    }
  }
  watch(selected, (id) => {
    if (current.value?.id !== id) {
      void inspect(id)
    }
  }, { immediate: true })
  async function create() {
    if (busy.value) {
      return
    }
    busy.value = true
    const scope = revision
    try {
      const value = (await api.create(workspaceId)).data
      if (!active || revision !== scope) {
        return
      }
      await list.refresh()
      if (!active || revision !== scope) {
        return
      }
      await navigateTo({ path: `/workspaces/${workspaceId}/ask`, query: { chat: value.id } })
    } catch (cause) {
      toast.add({ title: 'Unable to create conversation', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = false
    }
  }
  async function ask(value = question.value) {
    if (busy.value || loading.value || value.trim().length < 3) {
      return
    }
    busy.value = true
    const text = value.trim()
    pendingQuestion.value = text
    const scope = revision
    try {
      let chat = current.value
      if (!chat) {
        const created = (await api.create(workspaceId)).data
        chat = { ...created, messages: [] }
        current.value = chat
      }
      const response = (await api.ask(workspaceId, chat.id, text, chat.revision)).data
      if (!active || revision !== scope) {
        return
      }
      question.value = ''
      current.value = response
      pendingQuestion.value = ''
      await navigateTo({ path: `/workspaces/${workspaceId}/ask`, query: { chat: chat.id } }, { replace: !selected.value })
      if (!active) {
        return
      }
      await list.refresh()
    } catch (cause) {
      if (active && revision === scope) {
        question.value = text
        toast.add({ title: 'Couldn’t prepare an answer', description: errorMessage(cause), color: 'error' })
        await list.refresh()
      }
    } finally {
      if (active) {
        busy.value = false
        pendingQuestion.value = ''
      }
    }
  }
  async function rename(title: string) {
    if (!current.value || busy.value) {
      throw new Error('Wait until this conversation is ready before renaming it')
    }
    const id = current.value.id
    await api.rename(workspaceId, id, title)
    if (active && current.value?.id === id) {
      current.value = { ...current.value, title }
    }
    if (active) {
      await list.refresh()
    }
  }
  async function remove(id: string) {
    await api.remove(workspaceId, id)
    if (selected.value === id) {
      await navigateTo(`/workspaces/${workspaceId}/ask`)
    }
    await list.refresh()
  }
  useFeedbackToast(list.error, { key: `conversations:${workspaceId}`, title: 'Unable to load conversations', recovered: () => list.status.value === 'success', retry: () => list.refresh() })
  return { selected, list, current, loading, busy, question, pendingQuestion, inspect, create, ask, rename, remove }
}
