import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { refDebounced } from '@vueuse/core'
import type { MemberItem, MemberBulkAction, MemberAddResult } from '#shared/contracts/member'
import type { InviteRole } from '#shared/contracts/workspace'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import { useApi } from '~/core/http/useApi'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'

export function useMemberDirectory(workspaceId: string) {
  const api = useApi().members
  const toast = useToast()
  const { data: overview, loading: workspaceLoading, error: workspaceError, refresh: refreshOverview } = useWorkspace(workspaceId)
  const manager = computed(() => ['owner', 'admin'].includes(overview.value?.workspace.role || ''))
  const writable = computed(() => manager.value && !overview.value?.workspace.archivedAt)
  const owner = computed(() => overview.value?.workspace.role === 'owner')
  const canAdd = computed(() => !!overview.value && !overview.value.workspace.archivedAt && allowsWorkspaceAction(overview.value.workspace.role, overview.value.workspace.settings, 'inviteMembers'))
  const section = ref('people')
  const sections = [{ key: 'people', label: 'People', icon: 'i-lucide-users' }, { key: 'groups', label: 'Groups', icon: 'i-lucide-group' }]
  const query = ref('')
  const search = refDebounced(query, 250)
  const role = ref('all'), status = ref('all'), group = ref('all')
  const filters = computed(() => ({ q: search.value, role: role.value === 'all' ? undefined : role.value, status: status.value === 'all' ? undefined : status.value, groupId: group.value === 'all' ? undefined : group.value }))
  const { data: directory, status: loadStatus, error: loadError, refresh } = useLazyAsyncData(`member-directory:${workspaceId}`, async () => (await api.directory(workspaceId, filters.value)).data, { server: false, watch: [filters], default: () => ({ items: [], nextCursor: null, total: 0 }) })
  const { data: groups, status: groupsStatus, error: groupsError, refresh: refreshGroups } = useLazyAsyncData(`member-groups:${workspaceId}`, async () => (await api.groups(workspaceId)).data, { server: false, default: () => [] })
  const route = useRoute()
  const selected = ref<string[]>([]), adding = ref(false), detail = ref<MemberItem | null>(null), busy = ref(false), error = ref('')
  watch(() => route.hash, (hash) => {
    if (hash === '#invite') {
      adding.value = true
    }
  }, { immediate: true })
  useWorkspaceEvents(workspaceId, () => {
    void refresh()
    void refreshGroups()
  })
  watch(() => overview.value?.members, (members) => {
    if (detail.value) {
      detail.value = members?.find(item => item.id === detail.value?.id) || null
    }
  })
  const results = ref<MemberAddResult[]>([])
  const bulkRole = ref<InviteRole>('member')
  const roles = computed(() => [{ label: 'Member', value: 'member' }, { label: 'Viewer', value: 'viewer' }, ...(owner.value ? [{ label: 'Admin', value: 'admin' }] : [])])
  const pendingRemoval = ref(false)
  watch(filters, () => {
    selected.value = []
  })
  function manageable(member: MemberItem) {
    return writable.value && member.role !== 'owner' && (owner.value || member.role !== 'admin')
  }
  function toggle(id: string, checked: boolean | 'indeterminate') {
    selected.value = checked === true ? [...new Set([...selected.value, id])] : selected.value.filter(value => value !== id)
  }
  async function reload() {
    selected.value = []
    await Promise.all([refresh(), refreshGroups(), refreshWorkspace(workspaceId)])
    if (detail.value) {
      detail.value = overview.value?.members.find(item => item.id === detail.value?.id) || null
    }
  }
  async function bulk(action: MemberBulkAction) {
    if (busy.value || !selected.value.length) {
      return
    }
    busy.value = true
    error.value = ''
    try {
      const response = await api.bulk(workspaceId, selected.value, action, action === 'role' ? bulkRole.value : undefined)
      const failed = response.data.filter(item => !item.success)
      await reload()
      selected.value = failed.map(item => item.memberId)
      if (failed.length) {
        throw new Error(`${response.data.length - failed.length} updated; ${failed.length} failed. ${failed.map(item => item.message).join('. ')}`)
      }
      toast.add({ title: 'Member changes saved', color: 'success' })
    } catch (cause) {
      if (action === 'remove') {
        throw cause
      }
      error.value = errorMessage(cause)
    } finally {
      busy.value = false
    }
  }
  async function more() {
    if (!directory.value.nextCursor || busy.value) {
      return
    }
    const snapshot = { ...filters.value }
    const cursor = directory.value.nextCursor
    busy.value = true
    error.value = ''
    try {
      const next = (await api.directory(workspaceId, { ...snapshot, cursor })).data
      if (JSON.stringify(snapshot) !== JSON.stringify(filters.value) || cursor !== directory.value.nextCursor) {
        return
      }
      directory.value = { ...next, items: [...directory.value.items, ...next.items] }
    } catch (cause) {
      error.value = errorMessage(cause)
    } finally {
      busy.value = false
    }
  }
  return { overview, workspaceLoading, workspaceError, refreshOverview, manager, writable, owner, canAdd, section, sections, query, role, status, group, directory, loadStatus, loadError, groups, groupsStatus, groupsError, selected, adding, detail, busy, error, results, bulkRole, roles, pendingRemoval, manageable, toggle, reload, bulk, more }
}
