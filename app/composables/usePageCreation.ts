import type { WorkspaceOverview } from '#shared/types/workspace'
import { pageService } from '~/services/pageService'

export function usePageCreation(workspaceId: string) {
  const creatingPage = useState(`creating-page:${workspaceId}`, () => false)
  const { data } = useNuxtData<WorkspaceOverview>(`workspace:${workspaceId}`)
  const toast = useToast()
  async function createPage(folderId: string | null = null) {
    if (creatingPage.value) {
      return
    }
    creatingPage.value = true
    try {
      const { data: page } = await pageService.create(workspaceId, { title: 'Untitled', icon: '📄', folderId })
      if (data.value) {
        data.value = { ...data.value, pages: [...data.value.pages, page] }
      }
      await navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create page', description: errorMessage(cause), color: 'error' })
    } finally {
      creatingPage.value = false
    }
  }
  return { creatingPage, createPage }
}
