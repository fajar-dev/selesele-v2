import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'

export function useWorkspaceDirectory() {
  const { workspaces: workspaceApi } = useApi()
  const query = useLazyAsyncData(workspaceKeys.directory, async () => (await workspaceApi.list()).data, { server: false, default: () => [] })
  useFeedbackToast(query.error, { key: workspaceKeys.directory, title: 'Unable to load workspaces', recovered: () => query.status.value === 'success', retry: () => query.refresh() })
  return query
}
