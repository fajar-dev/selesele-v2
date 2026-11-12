import { workspaceService } from '~/services/workspaceService'

async function fetchDirectory() {
  return (await workspaceService.list()).data
}

export function useWorkspaceDirectory() {
  return useAsyncData('workspace-directory', fetchDirectory, { default: () => [] })
}
