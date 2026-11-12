import type { WorkspaceOverview } from '#shared/types/workspace'
import type { PageItem } from '#shared/types/page'
import { pageService } from '~/services/pageService'

export function useWorkspacePageMove(overview: MaybeRefOrGetter<WorkspaceOverview>) {
  const toast = useToast()
  const { data: cachedOverview } = useNuxtData<WorkspaceOverview>(`workspace:${toValue(overview).workspace.id}`)
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
      const response = await pageService.move(page.id, folderId)
      if (cachedOverview.value) {
        cachedOverview.value = { ...cachedOverview.value, pages: cachedOverview.value.pages.map(item => item.id === page.id ? response.data : item) }
      }
      const destination = current.folders.find(folder => folder.id === folderId)?.name || 'workspace root'
      announcement.value = `${page.title} moved to ${destination}`
      try {
        await refreshWorkspace(current.workspace.id)
      } catch {
        toast.add({ title: 'Page moved, but the workspace could not refresh', description: 'Reload to see the latest workspace changes.', color: 'warning' })
      }
    } catch (cause) {
      announcement.value = `Unable to move ${page.title}`
      toast.add({ title: 'Unable to move page', description: errorMessage(cause), color: 'error' })
    } finally {
      movingPageId.value = null
    }
  }

  return { movingPageId, announcement, movePage }
}
