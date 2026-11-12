import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'

export function usePageCreation(workspaceId: string) {
  const { pages: pageApi } = useApi()
  const creatingPage = useState(`creating-page:${workspaceId}`, () => false)
  const { upsertPage } = useWorkspaceState(workspaceId)
  const toast = useToast()
  async function createPage(folderId: string | null = null) {
    if (creatingPage.value) {
      return
    }
    creatingPage.value = true
    try {
      const { data: page } = await pageApi.create(workspaceId, { title: 'Untitled', icon: '📄', folderId })
      upsertPage(page)
      await navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create page', description: errorMessage(cause), color: 'error' })
    } finally {
      creatingPage.value = false
    }
  }
  return { creatingPage, createPage }
}
