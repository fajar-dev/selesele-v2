import { workspaceService } from '~/services/workspaceService'

export function useWorkspace(workspaceId: string) {
  return useAsyncData(`workspace:${workspaceId}`, async () => (await workspaceService.get(workspaceId)).data)
}

export async function refreshWorkspace(workspaceId: string) {
  await refreshNuxtData(`workspace:${workspaceId}`)
}
