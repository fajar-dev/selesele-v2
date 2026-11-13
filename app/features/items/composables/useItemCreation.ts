import { itemTypeIcons } from '#shared/kernel/content'
import type { ItemKind } from '#shared/kernel/content'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'

export function useItemCreation(workspaceId: string) {
  const { items: itemApi } = useApi()
  const creatingItem = useState(`creating-item:${workspaceId}`, () => false)
  const { upsertItem } = useWorkspaceState(workspaceId)
  const toast = useToast()
  async function createItem(folderId: string | null = null, kind: ItemKind = 'document') {
    if (creatingItem.value) {
      return
    }
    creatingItem.value = true
    try {
      const { data: item } = await itemApi.create(workspaceId, { title: 'Untitled', icon: itemTypeIcons[kind], folderId, kind })
      upsertItem(item)
      await navigateTo(`/workspaces/${workspaceId}/items/${item.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create item', description: errorMessage(cause), color: 'error' })
    } finally {
      creatingItem.value = false
    }
  }
  return { creatingItem, createItem }
}
