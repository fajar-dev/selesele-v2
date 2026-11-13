import { libraryKeys } from '~/features/library/state/libraryKeys'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { useApi } from '~/core/http/useApi'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import type { DropdownMenuItem } from '@nuxt/ui'

export function usePageTemplates(workspaceId: string, beforeCreate: () => void) {
  const { library } = useApi()
  const { upsertPage } = useWorkspaceState(workspaceId)
  const toast = useToast()
  const busy = ref(false)
  const { data, error, status, refresh } = useLazyAsyncData(libraryKeys.templates, async () => (await library.templates()).data, { server: false, immediate: false, default: () => [] })
  const custom = useLazyAsyncData(`workspace-templates:${workspaceId}`, async () => (await library.workspaceTemplates(workspaceId)).data, { server: false, immediate: false, default: () => [] })
  useFeedbackToast(custom.error, { key: `workspace-templates:${workspaceId}`, title: 'Unable to load workspace templates', recovered: () => custom.status.value === 'success', retry: () => custom.refresh() })
  useWorkspaceEvents(workspaceId, () => {
    if (custom.status.value !== 'idle') {
      void custom.refresh()
    }
  })
  useFeedbackToast(error, { key: libraryKeys.templates, title: 'Unable to load templates', recovered: () => status.value === 'success', retry: () => refresh() })
  function load(open: boolean) {
    if (open && custom.status.value !== 'pending') {
      void custom.refresh()
    }
    if (open && !data.value.length && status.value !== 'pending') {
      void refresh()
    }
  }
  async function create(id: string, folderId: string | null) {
    if (busy.value) {
      return
    }
    beforeCreate()
    busy.value = true
    try {
      const { data: page } = await library.createTemplate(workspaceId, id, folderId)
      upsertPage(page)
      await navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)
    } catch (cause) {
      toast.add({ title: 'Unable to create from template', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = false
    }
  }
  function items(folderId: string | null): DropdownMenuItem {
    const children: DropdownMenuItem[] = error.value
      ? [{ label: 'Retry loading templates', icon: 'i-lucide-refresh-cw', onSelect: () => {
          void refresh()
        } }]
      : data.value.map(template => ({ label: `${template.icon} ${template.title}`, disabled: busy.value, onSelect: () => {
          void create(template.id, folderId)
        } }))
    const workspaceItems: DropdownMenuItem[] = custom.data.value.map(template => ({ label: `${template.icon} ${template.title}`, disabled: busy.value, onSelect: () => {
      void create(template.id, folderId)
    } }))
    return {
      label: 'From template',
      icon: 'i-lucide-layout-template',
      children: [
        ...(workspaceItems.length ? [{ label: 'Workspace', type: 'label' as const }, ...workspaceItems, { type: 'separator' as const }] : []),
        ...(children.length ? children : [{ label: 'Loading templates…', disabled: true }]),
        { type: 'separator' }, { label: 'Manage templates', icon: 'i-lucide-settings-2', to: `/workspaces/${workspaceId}/templates` }
      ]
    }
  }
  return { load, items }
}
