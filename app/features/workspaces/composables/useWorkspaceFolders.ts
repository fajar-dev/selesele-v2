import type { FolderUpdate } from '#shared/contracts/workspace'
import { SerialTaskQueue } from '~/core/async/SerialTaskQueue'
import { useApi } from '~/core/http/useApi'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'

export function useWorkspaceFolders(workspaceId: string) {
  const { folders: folderApi } = useApi()
  const state = useWorkspaceState(workspaceId)
  const writes = new SerialTaskQueue()
  const creatingFolder = useState(`creating-folder:${workspaceId}`, () => false)
  const toast = useToast()
  async function createFolder() {
    if (creatingFolder.value) {
      return
    }
    creatingFolder.value = true
    try {
      const response = await folderApi.create(workspaceId, 'Untitled folder')
      state.addFolder(response.data)
      void refreshNuxtData(workspaceKeys.folders(workspaceId))
      await navigateTo(`/workspaces/${workspaceId}?folder=${response.data.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create folder', description: errorMessage(cause), color: 'error' })
    } finally {
      creatingFolder.value = false
    }
  }
  async function updateFolder(id: string, input: FolderUpdate) {
    await writes.run(async () => {
      const response = await folderApi.update(workspaceId, id, input)
      state.updateFolder(response.data)
    })
  }
  return { createFolder, creatingFolder, updateFolder }
}
