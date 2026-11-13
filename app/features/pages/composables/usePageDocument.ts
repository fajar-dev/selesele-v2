import type { PageItem } from '#shared/contracts/page'
import { useApi } from '~/core/http/useApi'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function usePageDocument(workspaceId: string, pageId: string) {
  const { pages } = useApi()
  const { upsertPage } = useWorkspaceState(workspaceId)
  // Document metadata and workspace navigation load independently.
  const workspaceQuery = useWorkspace(workspaceId)
  const pageQuery = useLazyAsyncData(`pages:${pageId}`, async () => {
    const { data } = await pages.get(pageId)
    if (data.workspaceId !== workspaceId) {
      throw createError({ statusCode: 404, message: 'Page not found in this workspace' })
    }
    return data
  }, { server: false })
  const overview = workspaceQuery.data
  const page = pageQuery.data
  watch(() => overview.value?.pages.find(item => item.id === pageId), (current) => {
    if (current) {
      page.value = current
    }
  })
  watch(() => workspaceQuery.pagesLoading.value, (loading) => {
    if (!loading && !workspaceQuery.pagesError.value && !overview.value?.pages.some(item => item.id === pageId)) {
      page.value = undefined
    }
  })
  function updated(current: PageItem) {
    page.value = current
    upsertPage(current)
  }
  return {
    page, overview, error: computed(() => pageQuery.error.value || workspaceQuery.error.value), updated,
    refresh: () => Promise.all([pageQuery.refresh(), workspaceQuery.refresh()]),
    loading: computed(() => workspaceQuery.loading.value || pageQuery.status.value === 'idle' || pageQuery.status.value === 'pending')
  }
}
