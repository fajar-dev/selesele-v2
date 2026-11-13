import type { ContentItem } from '#shared/contracts/item'
import type { FolderItem, WorkspaceItem } from '#shared/contracts/workspace'
import { workspaceKeys } from './workspaceKeys'

export function useWorkspaceState(workspaceId: string) {
  const { data: items } = useNuxtData<ContentItem[]>(workspaceKeys.items(workspaceId))
  const { data: folders } = useNuxtData<FolderItem[]>(workspaceKeys.folders(workspaceId))
  const { data: workspace } = useNuxtData<WorkspaceItem>(workspaceKeys.detail(workspaceId))
  function upsertItem(item: ContentItem) {
    items.value = [item, ...(items.value || []).filter(entry => entry.id !== item.id)]
  }
  function removeItem(itemId: string) {
    items.value = (items.value || []).filter(item => item.id !== itemId)
  }
  function addFolder(folder: FolderItem) {
    folders.value = [...(folders.value || []), folder]
  }
  function updateFolder(folder: FolderItem) {
    folders.value = (folders.value || []).map(item => item.id === folder.id ? folder : item)
  }
  function updateWorkspace(value: WorkspaceItem) {
    workspace.value = value
  }
  return { upsertItem, removeItem, addFolder, updateFolder, updateWorkspace }
}
