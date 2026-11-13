import type { ContentItem } from '#shared/contracts/item'
import { useApi } from '~/core/http/useApi'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function useContentItem(workspaceId: string, itemId: string) {
  const { items } = useApi()
  const { upsertItem } = useWorkspaceState(workspaceId)
  // Document metadata and workspace navigation load independently.
  const workspaceQuery = useWorkspace(workspaceId)
  const itemQuery = useLazyAsyncData(`items:${itemId}`, async () => {
    const { data } = await items.get(itemId)
    if (data.workspaceId !== workspaceId) {
      throw createError({ statusCode: 404, message: 'Item not found in this workspace' })
    }
    return data
  }, { server: false })
  const overview = workspaceQuery.data
  const item = itemQuery.data
  watch(() => overview.value?.items.find(item => item.id === itemId), (current) => {
    if (current) {
      item.value = current
    }
  })
  watch(() => workspaceQuery.itemsLoading.value, (loading) => {
    if (!loading && !workspaceQuery.itemsError.value && !overview.value?.items.some(item => item.id === itemId)) {
      item.value = undefined
    }
  })
  function updated(current: ContentItem) {
    item.value = current
    upsertItem(current)
  }
  return {
    item, overview, error: computed(() => itemQuery.error.value || workspaceQuery.error.value), updated,
    refresh: () => Promise.all([itemQuery.refresh(), workspaceQuery.refresh()]),
    loading: computed(() => workspaceQuery.loading.value || itemQuery.status.value === 'idle' || itemQuery.status.value === 'pending')
  }
}
