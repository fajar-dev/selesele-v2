import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'
import type { MoveImpact } from '#shared/kernel/access'

export function usePageMovement(overview: MaybeRefOrGetter<WorkspaceOverview>) {
  const { pages } = useApi()
  const toast = useToast()
  const { upsertPage } = useWorkspaceState(toValue(overview).workspace.id)
  const movingPageId = ref<string | null>(null)
  const announcement = ref('')
  const pendingMove = shallowRef<{
    page: PageItem
    folderId: string | null
    impact: MoveImpact
  } | null>(null)
  async function commit(page: PageItem, folderId: string | null, token: string) {
    upsertPage((await pages.move(page.id, folderId, token)).data)
    const destination = toValue(overview).folders.find(folder => folder.id === folderId)?.name || 'workspace root'
    announcement.value = `${page.title} moved to ${destination}`
    pendingMove.value = null
  }
  async function movePage(page: PageItem, folderId: string | null) {
    const current = toValue(overview)
    if (movingPageId.value || page.archivedAt || page.workspaceId !== current.workspace.id || page.folderId === folderId || (folderId && !current.folders.some(folder => folder.id === folderId))) {
      return
    }
    movingPageId.value = page.id
    try {
      const impact = (await pages.previewMove(page.id, folderId)).data
      if (impact.changes.length) {
        pendingMove.value = { page, folderId, impact }
      } else {
        await commit(page, folderId, impact.token)
      }
    } catch (cause) {
      announcement.value = `Unable to move ${page.title}`
      toast.add({ title: 'Unable to move page', description: errorMessage(cause), color: 'error' })
    } finally {
      movingPageId.value = null
    }
  }
  async function confirmMove() {
    const pending = pendingMove.value
    if (!pending || movingPageId.value) {
      return
    }
    movingPageId.value = pending.page.id
    try {
      await commit(pending.page, pending.folderId, pending.impact.token)
    } catch (cause) {
      toast.add({ title: 'Unable to move page', description: errorMessage(cause), color: 'error' })
      try {
        pendingMove.value = { ...pending, impact: (await pages.previewMove(pending.page.id, pending.folderId)).data }
      } catch { /* Keep the failed destination available for cancellation. */ }
    } finally {
      movingPageId.value = null
    }
  }
  return { movingPageId, announcement, pendingMove, movePage, confirmMove }
}
