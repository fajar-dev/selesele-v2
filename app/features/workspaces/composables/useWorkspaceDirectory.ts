import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'

export function useWorkspaceDirectory() {
  const { workspaces: workspaceApi } = useApi()
  return useAsyncData(workspaceKeys.directory, async () => (await workspaceApi.list()).data, { default: () => [] })
}
