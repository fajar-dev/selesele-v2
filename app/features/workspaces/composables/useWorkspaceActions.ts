import type { WorkspaceItem, WorkspaceUpdate } from '#shared/contracts/workspace'
import { SerialTaskQueue } from '~/core/async/SerialTaskQueue'
import { useApi } from '~/core/http/useApi'
import { workspaceKeys } from '../state/workspaceKeys'
import { useWorkspaceState } from '../state/useWorkspaceState'

/** Workspace mutations keep detail and directory caches consistent. */
export function useWorkspaceActions(workspaceId: string) {
  const { workspaces } = useApi()
  const cache = useWorkspaceState(workspaceId)
  const { data: directory } = useNuxtData<WorkspaceItem[]>(workspaceKeys.directory)
  const writes = new SerialTaskQueue()

  function save(input: WorkspaceUpdate): Promise<void> {
    return writes.run(async () => {
      const { data } = await workspaces.update(workspaceId, input)
      cache.updateWorkspace(data)
      directory.value = directory.value?.map(item => item.id === data.id ? data : item)
    })
  }

  async function remove(): Promise<void> {
    await workspaces.delete(workspaceId)
    directory.value = directory.value?.filter(item => item.id !== workspaceId)
    await navigateTo('/')
    clearNuxtData([
      workspaceKeys.detail(workspaceId), workspaceKeys.folders(workspaceId),
      workspaceKeys.pages(workspaceId), workspaceKeys.members(workspaceId), workspaceKeys.invitations(workspaceId)
    ])
  }

  return { save, remove }
}
