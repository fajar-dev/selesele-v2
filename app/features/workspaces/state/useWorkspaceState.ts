import type { PageItem } from '#shared/contracts/page'
import type { FolderItem, WorkspaceOverview } from '#shared/contracts/workspace'
import { workspaceKeys } from './workspaceKeys'

/** The single cache mutation boundary shared by workspace and document features. */
export function useWorkspaceState(workspaceId: string) {
  const { data } = useNuxtData<WorkspaceOverview>(workspaceKeys.detail(workspaceId))

  function upsertPage(page: PageItem) {
    if (data.value) {
      const pages = data.value.pages.filter(item => item.id !== page.id)
      data.value = { ...data.value, pages: [page, ...pages] }
    }
  }

  function removePage(pageId: string) {
    if (data.value) {
      data.value = { ...data.value, pages: data.value.pages.filter(page => page.id !== pageId) }
    }
  }

  function addFolder(folder: FolderItem) {
    if (data.value) {
      data.value = { ...data.value, folders: [...data.value.folders, folder] }
    }
  }

  function renameFolder(folderId: string, name: string) {
    if (data.value) {
      data.value = { ...data.value, folders: data.value.folders.map(folder => folder.id === folderId ? { ...folder, name } : folder) }
    }
  }
  return { data, upsertPage, removePage, addFolder, renameFolder }
}
