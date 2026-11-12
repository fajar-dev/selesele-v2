import { useApi } from '~/core/http/useApi'

export function usePageHistory(pageId: string) {
  const { recovery } = useApi()
  let requestId = 0
  onScopeDispose(() => {
    requestId++
  })
  const open = ref(false)
  const selected = ref<string | null>(null)
  const preview = ref<string | null>(null)
  const busy = ref(false)
  const previewLoading = ref(false)
  const error = ref('')
  const confirming = ref(false)
  const toast = useToast()
  const { data, status, error: loadError, refresh } = useLazyAsyncData(`versions:${pageId}`, async () => (await recovery.versions(pageId)).data, { server: false, immediate: false, default: () => [] })
  const current = computed(() => data.value.find(version => version.id === selected.value))
  const time = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const day = (date: string) => new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short' })
  watch(open, async (value, _previous, onCleanup) => {
    let active = true
    onCleanup(() => {
      active = false
      requestId++
    })
    if (!value) {
      return
    }
    error.value = ''
    await refresh()
    if (active && data.value[0]) {
      await inspect(data.value[0].id)
    }
  })
  async function inspect(id: string) {
    const request = ++requestId
    selected.value = id
    previewLoading.value = true
    preview.value = null
    confirming.value = false
    error.value = ''
    try {
      const result = await recovery.version(pageId, id)
      if (request === requestId && selected.value === id) {
        preview.value = result.data.content
      }
    } catch (cause) {
      if (request === requestId) {
        error.value = errorMessage(cause)
      }
    } finally {
      if (request === requestId && selected.value === id) {
        previewLoading.value = false
      }
    }
  }
  async function act(restore: boolean) {
    if (busy.value || (restore && !selected.value)) {
      return
    }
    busy.value = true
    error.value = ''
    try {
      if (restore) {
        await recovery.restoreVersion(pageId, selected.value!)
        toast.add({ title: 'Version restored and synced to collaborators', color: 'success' })
        confirming.value = false
      } else {
        await recovery.checkpoint(pageId)
        toast.add({ title: 'Version saved', color: 'success' })
      }
      await refresh()
      if (open.value && !restore && data.value[0]) {
        await inspect(data.value[0].id)
      }
    } catch (cause) {
      error.value = errorMessage(cause)
    } finally {
      busy.value = false
    }
  }
  return { open, selected, preview, busy, previewLoading, error, confirming, data, status, loadError, current, time, day, inspect, act }
}
