import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'

export function useWorkspace(workspaceId: string) {
  const { workspaces: workspaceApi } = useApi()
  return useAsyncData(workspaceKeys.detail(workspaceId), async () => (await workspaceApi.get(workspaceId)).data)
}

export async function refreshWorkspace(workspaceId: string) {
  await refreshNuxtData(workspaceKeys.detail(workspaceId))
}
