import { useApi } from '~/core/http/useApi'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import type { WorkspaceItem } from '#shared/contracts/workspace'

export function useWorkspaceCreation() {
  const { workspaces } = useApi()
  const { data: directory } = useNuxtData<WorkspaceItem[]>(workspaceKeys.directory)
  const creatingWorkspace = useState('creating-workspace', () => false)
  const toast = useToast()

  async function createWorkspace() {
    if (creatingWorkspace.value) {
      return
    }
    creatingWorkspace.value = true
    try {
      const { data: workspace } = await workspaces.create('Untitled workspace')
      directory.value = [workspace, ...(directory.value || []).filter(item => item.id !== workspace.id)]
      void refreshNuxtData(workspaceKeys.directory)
      await navigateTo(`/workspaces/${workspace.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create workspace', description: errorMessage(cause), color: 'error' })
    } finally {
      creatingWorkspace.value = false
    }
  }
  return { createWorkspace, creatingWorkspace }
}
