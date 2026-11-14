import type { CanvasContent } from '#shared/kernel/content'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { CanvasDraftStorage } from '../storage/CanvasDraftStorage'
import type { SavedCanvasDraft } from '../storage/CanvasDraftStorage'
import { useAuth } from '~/features/auth/composables/useAuth'
import { canonicalJson } from '#shared/kernel/json'
import { CanvasSession } from '../domain/CanvasSession'

export function useCanvas(itemId: string, workspaceId: string, readonly: () => boolean) {
  const api = useApi().canvases
  const toast = useToast()
  const session = shallowRef<CanvasSession | null>(null)
  const failed = ref(false)
  const recovered = shallowRef<SavedCanvasDraft | null>(null)
  const { state: auth } = useAuth()
  let storage: CanvasDraftStorage | undefined
  let storageWarning = false
  function persist() {
    if (!storage || !session.value || recovered.value || readonly()) {
      return
    }
    try {
      if (session.value.dirty) {
        storage.write({ content: session.value.draft, revision: session.value.draftRevision, savedAt: Date.now() })
      } else {
        storage.clear()
      }
    } catch {
      if (!storageWarning) {
        toast.add({ title: 'Local draft backup unavailable', description: 'Browser storage is full or disabled. Keep this tab open until changes are saved.', color: 'warning' })
      }
      storageWarning = true
    }
  }
  const query = useLazyAsyncData(`canvas:${itemId}`, async () => (await api.get(itemId)).data, { server: false })
  watch(query.data, (state) => {
    if (!state) {
      return
    }
    if (!session.value) {
      session.value = shallowReactive(new CanvasSession(api, itemId, state))
      if (import.meta.client && auth.user && !readonly()) {
        try {
          storage = new CanvasDraftStorage(window.localStorage, auth.user.id, itemId)
          const draft = storage.read()
          if (draft?.content.kind === state.content.kind && canonicalJson(draft.content) !== canonicalJson(state.content)) {
            recovered.value = draft
          } else {
            storage.clear()
          }
        } catch { /* Storage may be disabled; server editing remains available. */ }
      }
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
    if (readonly() || !session.value || recovered.value) {
      return
    }
    failed.value = false
    try {
      await session.value.save()
      persist()
    } catch (cause) {
      failed.value = true
      clearTimeout(timer)
      toast.add({ title: 'Your changes could not be saved', description: errorMessage(cause), color: 'error' })
    }
  }
  watch(() => session.value?.draft, () => {
    clearTimeout(timer)
    persist()
    if (!recovered.value && !readonly() && session.value?.dirty && !failed.value && !session.value.remote) {
      timer = setTimeout(() => {
        if (!failed.value) {
          void save()
        }
      }, 800)
    }
  }, { flush: 'sync' })
  watch(() => session.value?.saving, (saving) => {
    if (!saving && !recovered.value && session.value?.dirty && !failed.value && !session.value.remote && !readonly()) {
      timer = setTimeout(() => {
        if (!failed.value) {
          void save()
        }
      }, 800)
    }
  })
  function restoreDraft() {
    const saved = recovered.value, current = session.value
    if (!saved || !current || readonly()) {
      return
    }
    current.restore(saved.content, saved.revision)
    recovered.value = null
    persist()
    if (!current.remote) {
      void save()
    }
  }
  function discardRecovered() {
    recovered.value = null
    try {
      storage?.clear()
    } catch { /* Storage may be disabled. */ }
  }
  watch(() => [session.value?.revision, session.value?.dirty], persist, { flush: 'sync' })
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
    if (!readonly() && !recovered.value) {
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
  return { recovered, restoreDraft, discardRecovered, session, query, failed, edit, save, overwrite }
}
