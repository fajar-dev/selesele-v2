import { useApi } from '~/core/http/useApi'

export function useItemHistory(itemId: string) {
  const { recovery, items } = useApi()
  const liveContent = ref('')
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
  const { data, status, error: loadError, refresh } = useLazyAsyncData(`versions:${itemId}`, async () => (await recovery.versions(itemId)).data, { server: false, immediate: false, default: () => [] })
  const current = computed(() => data.value.find(version => version.id === selected.value))
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
      const [result, live] = await Promise.all([recovery.version(itemId, id), items.content(itemId)])
      if (request === requestId && selected.value === id) {
        preview.value = result.data.content
        liveContent.value = live.data.content
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
        await recovery.restoreVersion(itemId, selected.value!)
        toast.add({ title: 'Version restored and synced to collaborators', color: 'success' })
        confirming.value = false
      } else {
        await recovery.checkpoint(itemId)
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
  return { open, selected, preview, liveContent, busy, previewLoading, error, confirming, data, status, loadError, current, refresh, inspect, act }
}
