import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { libraryKeys } from '~/features/library/state/libraryKeys'
import type { TrashItem } from '#shared/contracts/recovery'

export function useTrash(workspaceId: Ref<string | null>) {
  const { recovery } = useApi()
  const { data, error, status, refresh } = useLazyAsyncData('trash', async () => (await recovery.trash()).data, { server: false, default: () => [] })
  useFeedbackToast(error, { key: 'trash', title: 'Unable to load trash', recovered: () => status.value === 'success', retry: () => refresh() })
  const scopedItems = computed(() => workspaceId.value ? data.value.filter(item => item.workspaceId === workspaceId.value) : data.value)
  const filter = ref('all')
  const search = ref('')
  const filtering = computed(() => !!search.value.trim() || filter.value !== 'all')
  watch(workspaceId, () => {
    filter.value = 'all'
    search.value = ''
  })
  const visible = computed(() => scopedItems.value.filter(item => (filter.value === 'all' || item.kind === filter.value) && `${item.title} ${item.workspaceName}`.toLowerCase().includes(search.value.toLowerCase().trim())))
  const loading = computed(() => !data.value.length && (status.value === 'idle' || status.value === 'pending'))
  const busy = ref<string | null>(null)
  const deleting = ref<TrashItem | null>(null)
  const deleteOpen = ref(false)
  const toast = useToast()
  async function restore(item: TrashItem) {
    if (busy.value) {
      return
    }
    busy.value = item.id
    try {
      await recovery.restore(item.kind, item.id)
      await Promise.all([refresh(), refreshNuxtData([libraryKeys.personal, workspaceKeys.directory, workspaceKeys.items(item.workspaceId), workspaceKeys.folders(item.workspaceId)])])
      toast.add({ title: 'Item restored', color: 'success' })
    } catch (cause) {
      toast.add({ title: 'Unable to restore item', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = null
    }
  }
  async function purge() {
    if (!deleting.value) {
      return
    }
    await recovery.purge(deleting.value.kind, deleting.value.id)
    await refresh()
  }
  return { error, refresh, scopedItems, filter, search, filtering, visible, loading, busy, deleting, deleteOpen, restore, purge }
}
