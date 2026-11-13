import { libraryKeys } from '~/features/library/state/libraryKeys'
import { useApi } from '~/core/http/useApi'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function useItemDeletion(workspaceId: string) {
  const { items } = useApi()
  const { removeItem } = useWorkspaceState(workspaceId)
  const route = useRoute()
  async function deleteItem(itemId: string) {
    await items.delete(itemId)
    removeItem(itemId)
    void refreshNuxtData(libraryKeys.personal)
    if (route.params.id === itemId) {
      await navigateTo(`/workspaces/${workspaceId}`)
    }
  }
  return { deleteItem }
}
