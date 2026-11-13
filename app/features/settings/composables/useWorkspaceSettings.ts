import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { reconcileDraft } from '~/core/state/reconcileDraft'
import type { WorkspaceSettingsChanges } from '#shared/kernel/workspaceSettings'
import { useApi } from '~/core/http/useApi'
import { defaultNotificationPreferences, defaultWorkspaceSettings } from '#shared/kernel/workspaceSettings'
import { refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import type { WorkspaceActivityPage } from '#shared/contracts/workspaceSettings'

export function useWorkspaceSettings(workspaceId: string, manager: Ref<boolean>, section: Ref<string>) {
  const { workspaceSettings: api } = useApi()
  const toast = useToast()
  const query = useLazyAsyncData(`workspace-settings:${workspaceId}`, async () => (await api.get(workspaceId)).data, { server: false })
  const draft = ref(defaultWorkspaceSettings())
  const notifications = ref(defaultNotificationPreferences())
  watch(query.data, (data, previous) => {
    if (data) {
      draft.value = reconcileDraft(toRaw(draft.value), previous ? toRaw(previous.settings) : undefined, toRaw(data.settings))
      notifications.value = reconcileDraft(toRaw(notifications.value), previous ? toRaw(previous.notifications) : undefined, toRaw(data.notifications))
    }
  }, { immediate: true })
  const busy = ref(false)
  const error = ref<string | null>(null)
  async function mutate(work: () => Promise<unknown>, message: string, reportError = true) {
    if (busy.value) {
      return
    }
    busy.value = true
    error.value = null
    try {
      await work()
      toast.add({ title: message, color: 'success' })
      return true
    } catch (cause) {
      error.value = errorMessage(cause)
      if (reportError) {
        toast.add({ title: 'Unable to save changes', description: error.value, color: 'error' })
      }
      return false
    } finally {
      busy.value = false
    }
  }
  const activity = useLazyAsyncData(`workspace-activity:${workspaceId}`, async () => manager.value ? (await api.activity(workspaceId)).data : { items: [], nextCursor: null }, { server: false, immediate: false, default: (): WorkspaceActivityPage => ({ items: [], nextCursor: null }) })
  const usage = useLazyAsyncData(`workspace-usage:${workspaceId}`, async () => manager.value ? (await api.usage(workspaceId)).data : null, { server: false, immediate: false })
  watch([manager, section], ([allowed, active]) => {
    if (!allowed) {
      activity.clear()
      usage.clear()
      return
    }
    if (active === 'activity') {
      void activity.refresh()
    }
    if (active === 'data') {
      void usage.refresh()
    }
  }, { immediate: true })
  useWorkspaceEvents(workspaceId, () => {
    void query.refresh()
    if (manager.value && section.value === 'activity') {
      void activity.refresh()
    }
    if (manager.value && section.value === 'data') {
      void usage.refresh()
    }
  })
  async function save(changes: WorkspaceSettingsChanges) {
    await mutate(async () => {
      await api.save(workspaceId, changes)
      await refreshWorkspace(workspaceId)
      await query.refresh()
      if (section.value === 'activity') {
        await activity.refresh()
      }
    }, 'Workspace settings saved')
  }
  async function saveNotifications() {
    await mutate(async () => {
      await api.notifications(workspaceId, notifications.value)
      await query.refresh()
    }, 'Notification preferences saved')
  }
  async function moreActivity() {
    const cursor = activity.data.value.nextCursor
    if (!cursor) {
      return
    }
    await mutate(async () => {
      const { data } = await api.activity(workspaceId, cursor)
      activity.data.value = { items: [...activity.data.value.items, ...data.items], nextCursor: data.nextCursor }
    }, 'More activity loaded')
  }
  async function exportWorkspace() {
    await mutate(async () => {
      const blob = await api.export(workspaceId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `workspace-${workspaceId}.tar.gz`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }, 'Workspace export downloaded')
  }
  async function lifecycle(action: 'archive' | 'unarchive' | 'transfer' | 'leave', targetId?: string) {
    const done = await mutate(async () => {
      if (action === 'leave') {
        await api.leave(workspaceId)
      } else if (action === 'transfer') {
        await api.transfer(workspaceId, targetId!)
      } else {
        await api.archive(workspaceId, action === 'archive')
      }
      await refreshNuxtData(workspaceKeys.directory)
      if (action !== 'leave') {
        await refreshWorkspace(workspaceId)
        await query.refresh()
        if (section.value === 'activity') {
          await activity.refresh()
        }
      }
    }, 'Workspace updated', false)
    if (done && action === 'leave') {
      await navigateTo('/')
    }
    if (!done) {
      throw new Error(error.value || 'Unable to update workspace')
    }
  }
  return { query, draft, notifications, busy, activity, usage, save, saveNotifications, moreActivity, exportWorkspace, lifecycle }
}
