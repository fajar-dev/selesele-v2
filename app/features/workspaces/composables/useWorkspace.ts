import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'
import type { WorkspaceOverview } from '#shared/contracts/workspace'

/** Independent resources share cache keys; no request waits for another collection. */
export function useWorkspace(workspaceId: string) {
  const api = useApi()
  const workspace = useLazyAsyncData(workspaceKeys.detail(workspaceId), async () => (await api.workspaces.get(workspaceId)).data, { dedupe: 'defer', server: false })
  const folders = useLazyAsyncData(workspaceKeys.folders(workspaceId), async () => (await api.folders.list(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  const pages = useLazyAsyncData(workspaceKeys.pages(workspaceId), async () => (await api.pages.list(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  const members = useLazyAsyncData(workspaceKeys.members(workspaceId), async () => (await api.memberships.list(workspaceId)).data, { dedupe: 'defer', server: false, default: () => [] })
  const data = computed<WorkspaceOverview | undefined>(() => workspace.data.value
    ? {
        workspace: workspace.data.value, folders: folders.data.value, pages: pages.data.value, members: members.data.value
      }
    : undefined)
  const pending = (resource: { status: Ref<string> }) => computed(() => resource.status.value === 'idle' || resource.status.value === 'pending')
  return {
    data, error: workspace.error, loading: pending(workspace),
    foldersLoading: pending(folders), pagesLoading: pending(pages), membersLoading: pending(members),
    foldersError: folders.error, pagesError: pages.error, membersError: members.error,
    refresh: () => refreshWorkspace(workspaceId)
  }
}

export async function refreshWorkspace(workspaceId: string) {
  await refreshNuxtData([workspaceKeys.detail(workspaceId), workspaceKeys.folders(workspaceId), workspaceKeys.pages(workspaceId), workspaceKeys.members(workspaceId)])
}
