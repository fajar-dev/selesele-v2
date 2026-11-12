import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'

export function usePageMovement(overview: MaybeRefOrGetter<WorkspaceOverview>) {
  const { pages: pageApi } = useApi()
  const toast = useToast()
  const { upsertPage } = useWorkspaceState(toValue(overview).workspace.id)
  const movingPageId = ref<string | null>(null)
  const announcement = ref('')

  async function movePage(page: PageItem, folderId: string | null): Promise<void> {
    const current = toValue(overview)
    if (movingPageId.value || page.workspaceId !== current.workspace.id || page.folderId === folderId) {
      return
    }
    if (folderId && !current.folders.some(folder => folder.id === folderId)) {
      return
    }

    movingPageId.value = page.id
    try {
      const response = await pageApi.move(page.id, folderId)
      upsertPage(response.data)
      const destination = current.folders.find(folder => folder.id === folderId)?.name || 'workspace root'
      announcement.value = `${page.title} moved to ${destination}`
    } catch (cause) {
      announcement.value = `Unable to move ${page.title}`
      toast.add({ title: 'Unable to move page', description: errorMessage(cause), color: 'error' })
    } finally {
      movingPageId.value = null
    }
  }

  return { movingPageId, announcement, movePage }
}
