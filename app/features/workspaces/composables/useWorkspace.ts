import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { useApi } from '~/core/http/useApi'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
/** Independent resources share cache keys; no request waits for another collection. */
export function useWorkspace(workspaceId: string) {
  const api = useApi()
  const workspace = useLazyAsyncData(workspaceKeys.detail(workspaceId), async () => (await api.workspaces.get(workspaceId)).data, { dedupe: 'defer', server: false })
  const folders = useLazyAsyncData(workspaceKeys.folders(workspaceId), async () => (await api.folders.list(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  const items = useLazyAsyncData(workspaceKeys.items(workspaceId), async () => (await api.items.list(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  const members = useLazyAsyncData(workspaceKeys.members(workspaceId), async () => (await api.members.roster(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  for (const [resource, key, title] of [
    [workspace, workspaceKeys.detail(workspaceId), 'Unable to load workspace'],
    [folders, workspaceKeys.folders(workspaceId), 'Unable to load folders'],
    [items, workspaceKeys.items(workspaceId), 'Unable to load items'],
    [members, workspaceKeys.members(workspaceId), 'Unable to load member roster']
  ] as const) {
    useFeedbackToast(resource.error, { key, title, recovered: () => resource.status.value === 'success', retry: () => resource.refresh() })
  }
  useFeedbackToast(() => workspace.data.value?.archivedAt ? 'Documents and membership are read-only. The owner can restore the workspace in Settings → Lifecycle.' : null, { key: `workspace-archived:${workspaceId}`, title: 'This workspace is archived', color: 'neutral' })
  const data = computed<WorkspaceOverview | undefined>(() => workspace.data.value
    ? {
        workspace: workspace.data.value, folders: folders.data.value, items: items.data.value, members: members.data.value
      }
    : undefined)
  const pending = (resource: {
    status: Ref<string>
  }) => computed(() => resource.status.value === 'idle' || resource.status.value === 'pending')
  return {
    data, error: workspace.error, loading: pending(workspace),
    foldersLoading: pending(folders), itemsLoading: pending(items), membersLoading: pending(members),
    foldersError: folders.error, itemsError: items.error, membersError: members.error,
    refresh: () => refreshWorkspace(workspaceId)
  }
}
export async function refreshWorkspace(workspaceId: string) {
  await refreshNuxtData([workspaceKeys.detail(workspaceId), workspaceKeys.folders(workspaceId), workspaceKeys.items(workspaceId), workspaceKeys.members(workspaceId)])
}
