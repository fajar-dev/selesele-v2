import { useApi } from '~/core/http/useApi'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function usePageDeletion(workspaceId: string) {
  const { pages } = useApi()
  const { removePage } = useWorkspaceState(workspaceId)
  const route = useRoute()

  async function deletePage(pageId: string) {
    await pages.delete(pageId)
    removePage(pageId)
    if (route.params.id === pageId) {
      await navigateTo(`/workspaces/${workspaceId}`)
    }
  }
  return { deletePage }
}
