import { useApi } from '~/core/http/useApi'
import { workspaceKeys } from '../state/workspaceKeys'

export function useInvitationInbox(refreshDirectory: () => Promise<unknown>) {
  const { invitations: invitationApi } = useApi()
  const toast = useToast()
  const busy = ref<string | null>(null)
  const { data: invitations, error: inboxError, status: inboxStatus, refresh: refreshInbox } = useLazyAsyncData(
    workspaceKeys.inbox, async () => (await invitationApi.inbox()).data, { server: false, default: () => [] }
  )
  async function respond(id: string, accept: boolean) {
    busy.value = id
    try {
      if (accept) {
        const response = await invitationApi.accept(id)
        invitations.value = invitations.value.filter(item => item.id !== id)
        void refreshDirectory()
        await navigateTo(`/workspaces/${response.data.workspaceId}`)
      } else {
        await invitationApi.decline(id)
        await Promise.all([refreshDirectory(), refreshInbox()])
      }
    } catch (cause) {
      toast.add({ title: 'Unable to respond to invitation', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = null
    }
  }
  return { invitations, inboxError, inboxStatus, refreshInbox, busy, respond }
}
