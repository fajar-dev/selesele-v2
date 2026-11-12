import type { PageItem } from '#shared/contracts/page'
import type { FolderItem, WorkspaceItem } from '#shared/contracts/workspace'
import { workspaceKeys } from './workspaceKeys'

export function useWorkspaceState(workspaceId: string) {
  const { data: pages } = useNuxtData<PageItem[]>(workspaceKeys.pages(workspaceId))
  const { data: folders } = useNuxtData<FolderItem[]>(workspaceKeys.folders(workspaceId))
  const { data: workspace } = useNuxtData<WorkspaceItem>(workspaceKeys.detail(workspaceId))
  function upsertPage(page: PageItem) {
    pages.value = [page, ...(pages.value || []).filter(item => item.id !== page.id)]
  }
  function removePage(pageId: string) {
    pages.value = (pages.value || []).filter(page => page.id !== pageId)
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
  return { upsertPage, removePage, addFolder, updateFolder, updateWorkspace }
}
