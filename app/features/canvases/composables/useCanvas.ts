import type { CanvasContent } from '#shared/kernel/content'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { CanvasSession } from '../domain/CanvasSession'

export function useCanvas(itemId: string, workspaceId: string, readonly: () => boolean) {
  const api = useApi().canvases
  const toast = useToast()
  const session = shallowRef<CanvasSession | null>(null)
  const failed = ref(false)
  const query = useLazyAsyncData(`canvas:${itemId}`, async () => (await api.get(itemId)).data, { server: false })
  watch(query.data, (state) => {
    if (!state) {
      return
    }
    if (!session.value) {
      session.value = shallowReactive(new CanvasSession(api, itemId, state))
    } else {
      session.value.observe(state)
    }
  }, { immediate: true })
  useFeedbackToast(query.error, { key: `canvas:${itemId}`, title: 'Unable to load item', recovered: () => query.status.value === 'success', retry: () => query.refresh() })
  useWorkspaceEvents(workspaceId, () => {
    void query.refresh()
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  async function save() {
    if (readonly() || !session.value) {
      return
    }
    failed.value = false
    try {
      await session.value.save()
    } catch (cause) {
      failed.value = true
      toast.add({ title: 'Your changes could not be saved', description: errorMessage(cause), color: 'error' })
    }
  }
  watch(() => session.value?.draft, () => {
    clearTimeout(timer)
    if (!readonly() && session.value?.dirty && !failed.value && !session.value.remote) {
      timer = setTimeout(() => {
        void save()
      }, 800)
    }
  })
  watch(() => session.value?.saving, (saving) => {
    if (!saving && session.value?.dirty && !failed.value && !session.value.remote && !readonly()) {
      timer = setTimeout(() => {
        void save()
      }, 800)
    }
  })
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (session.value?.dirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onScopeDispose(() => {
    clearTimeout(timer)
    if (import.meta.client) {
      window.removeEventListener('beforeunload', beforeUnload)
    }
  })
  onBeforeRouteLeave(async () => {
    if (!session.value?.dirty) {
      return true
    }
    if (!readonly()) {
      await save()
    }
    if (session.value.dirty) {
      toast.add({ title: 'Save or export your draft before leaving', description: 'Your unsaved changes are still available in this editor.', color: 'warning' })
      return false
    }
    return true
  })
  function edit(content: CanvasContent) {
    if (!readonly()) {
      session.value?.edit(content)
    }
  }
  async function overwrite() {
    if (!session.value || readonly()) {
      return
    }
    try {
      await session.value.replaceRemote()
      failed.value = false
    } catch (cause) {
      failed.value = true
      toast.add({ title: 'Unable to save draft', description: errorMessage(cause), color: 'error' })
      throw cause
    }
  }
  return { session, query, failed, edit, save, overwrite }
}
