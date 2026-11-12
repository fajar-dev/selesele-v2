import { useApi } from '~/core/http/useApi'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function useWorkspaceFolders(workspaceId: string) {
  const { folders: folderApi } = useApi()
  const state = useWorkspaceState(workspaceId)
  async function createFolder(name: string) {
    const response = await folderApi.create(workspaceId, name)
    state.addFolder(response.data)
  }
  async function renameFolder(id: string, name: string) {
    await folderApi.rename(workspaceId, id, name)
    state.renameFolder(id, name)
  }
  return { createFolder, renameFolder }
}
