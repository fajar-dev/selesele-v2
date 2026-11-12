import type { WorkspaceOverview } from '#shared/types/workspace'
import { workspaceService } from '~/services/workspaceService'

export function useWorkspaceFolders(workspaceId: string) {
  const { data } = useNuxtData<WorkspaceOverview>(`workspace:${workspaceId}`)
  async function createFolder(name: string) {
    const response = await workspaceService.createFolder(workspaceId, name)
    if (data.value) {
      data.value = { ...data.value, folders: [...data.value.folders, response.data] }
    }
  }
  async function renameFolder(id: string, name: string) {
    await workspaceService.renameFolder(workspaceId, id, name)
    if (data.value) {
      data.value = { ...data.value, folders: data.value.folders.map(folder => folder.id === id ? { ...folder, name } : folder) }
    }
  }
  return { createFolder, renameFolder }
}
