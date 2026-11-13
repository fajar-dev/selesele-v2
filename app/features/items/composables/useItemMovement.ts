import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import type { ContentItem } from '#shared/contracts/item'
import type { MoveImpact } from '#shared/kernel/access'

export function useItemMovement(overview: MaybeRefOrGetter<WorkspaceOverview>) {
  const { items } = useApi()
  const toast = useToast()
  const { upsertItem } = useWorkspaceState(toValue(overview).workspace.id)
  const movingItemId = ref<string | null>(null)
  const announcement = ref('')
  const pendingMove = shallowRef<{
    item: ContentItem
    folderId: string | null
    impact: MoveImpact
  } | null>(null)
  async function commit(item: ContentItem, folderId: string | null, token: string) {
    upsertItem((await items.move(item.id, folderId, token)).data)
    const destination = toValue(overview).folders.find(folder => folder.id === folderId)?.name || 'workspace root'
    announcement.value = `${item.title} moved to ${destination}`
    pendingMove.value = null
  }
  async function moveItem(item: ContentItem, folderId: string | null) {
    const current = toValue(overview)
    if (movingItemId.value || item.archivedAt || item.workspaceId !== current.workspace.id || item.folderId === folderId || (folderId && !current.folders.some(folder => folder.id === folderId))) {
      return
    }
    movingItemId.value = item.id
    try {
      const impact = (await items.previewMove(item.id, folderId)).data
      if (impact.changes.length) {
        pendingMove.value = { item, folderId, impact }
      } else {
        await commit(item, folderId, impact.token)
      }
    } catch (cause) {
      announcement.value = `Unable to move ${item.title}`
      toast.add({ title: 'Unable to move item', description: errorMessage(cause), color: 'error' })
    } finally {
      movingItemId.value = null
    }
  }
  async function confirmMove() {
    const pending = pendingMove.value
    if (!pending || movingItemId.value) {
      return
    }
    movingItemId.value = pending.item.id
    try {
      await commit(pending.item, pending.folderId, pending.impact.token)
    } catch (cause) {
      toast.add({ title: 'Unable to move item', description: errorMessage(cause), color: 'error' })
      try {
        pendingMove.value = { ...pending, impact: (await items.previewMove(pending.item.id, pending.folderId)).data }
      } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
    } finally {
      movingItemId.value = null
    }
  }
  return { movingItemId, announcement, pendingMove, moveItem, confirmMove }
}
