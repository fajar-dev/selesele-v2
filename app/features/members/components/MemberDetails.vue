<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import type { MemberItem, MemberResourceAccess, AccessLevel } from '#shared/contracts/member'
import type { InviteRole } from '#shared/contracts/workspace'
import { useApi } from '~/core/http/useApi'
import DetailPanel from '~/components/ui/DetailPanel.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'

const { workspaceId, member, canManage, roles } = defineProps<{
  workspaceId: string
  member: MemberItem
  canManage: boolean
  roles: {
    label: string
    value: string
  }[]
}>()
const emit = defineEmits<{
  close: [
  ]
  changed: [
  ]
}>()
const api = useApi().members
const open = ref(true), tab = ref('profile'), busy = ref(false), error = ref(''), removing = ref(false), resourceQuery = ref('')
watch(open, (value) => {
  if (!value) {
    emit('close')
  }
})
const { data: access, status, error: accessError, refresh } = useLazyAsyncData(`member-access:${workspaceId}:${member.id}`, async () => (await api.access(workspaceId, member.id)).data, { server: false, immediate: false, default: () => [] })
const { data: history, status: historyStatus, error: historyError, refresh: refreshHistory } = useLazyAsyncData(`member-history:${workspaceId}:${member.id}`, async () => (await api.history(workspaceId, member.id)).data, { server: false, immediate: false, default: () => ({ items: [], nextCursor: null }) })
watch(tab, (active) => {
  if (active === 'access') {
    void refresh()
  }
  if (active === 'history') {
    void refreshHistory()
  }
})
useWorkspaceEvents(workspaceId, () => {
  if (tab.value === 'access') {
    void refresh()
  }
  if (tab.value === 'history') {
    void refreshHistory()
  }
})
const resources = computed(() => access.value.filter(item => item.title.toLowerCase().includes(resourceQuery.value.toLowerCase())))
const previewVisibility = ref(false)
const displayedResources = computed(() => resources.value.filter(item => !previewVisibility.value || item.level !== 'none'))
const sourceLabels = { owner: 'Workspace owner', suspended: 'Membership suspended', direct: 'Individual override', group: 'Group permissions', inherited: 'Inherited from workspace or folder', restricted: 'Restricted without a matching grant', parent: 'Blocked by the parent folder' }
const policy = ref<MemberResourceAccess | null>(null)
const editing = ref<MemberResourceAccess | null>(null), level = ref('inherit'), expires = ref('')
function start(item: MemberResourceAccess) {
  editing.value = item
  level.value = item.direct?.level || 'inherit'
  expires.value = item.direct?.expiresAt ? new Date(new Date(item.direct.expiresAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
}
async function action(work: () => Promise<unknown>) {
  if (busy.value) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    await work()
    if (tab.value === 'access') {
      await refresh()
    }
    if (tab.value === 'history') {
      await refreshHistory()
    }
    emit('changed')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
async function grant() {
  const item = editing.value
  if (!item) {
    return
  }
  await action(async () => {
    await api.grant(workspaceId, member.id, { kind: item.kind, resourceId: item.id, level: level.value === 'inherit' ? null : level.value as AccessLevel, expiresAt: expires.value && level.value !== 'inherit' ? new Date(expires.value).toISOString() : null })
    editing.value = null
  })
}
async function moreHistory() {
  if (!history.value.nextCursor || busy.value) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    const next = (await api.history(workspaceId, member.id, history.value.nextCursor)).data
    history.value = { ...next, items: [...history.value.items, ...next.items] }
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not yet'
}
useFeedbackToast(error, { key: `member-update:${member.id}`, title: 'Unable to update member' })
useFeedbackToast(() => tab.value === 'access' ? accessError.value : null, { key: `member-access:${workspaceId}:${member.id}`, title: 'Unable to load permissions', recovered: () => status.value === 'success', retry: () => refresh() })
useFeedbackToast(() => tab.value === 'history' ? historyError.value : null, { key: `member-history:${workspaceId}:${member.id}`, title: 'Unable to load membership history', recovered: () => historyStatus.value === 'success', retry: () => refreshHistory() })
</script>

<template>
  <DetailPanel
    v-model:open="open"
    title="Member details"
    description="Profile, permissions, and membership history"
    icon="i-lucide-user-round"
    wide
  >
    <template #body>
      <div class="p-ui-xl space-y-ui-xl">
        <div class="flex gap-ui-md items-center">
          <UAvatar
            :alt="member.name || member.email"
            :src="member.avatar || undefined"
            size="lg"
          /><div class="min-w-ui-zero">
            <h2 class="text-base font-semibold truncate">
              {{ member.name || member.email }}
            </h2><p class="text-sm text-muted break-all">
              {{ member.email }}
            </p>
          </div>
        </div>
        <div
          class="flex flex-wrap gap-ui-xs"
          role="group"
          aria-label="Member detail sections"
        >
          <UButton
            v-for="item in [{ id: 'profile', label: 'Profile' }, { id: 'access', label: 'Document access' }, { id: 'history', label: 'History' }]"
            :key="item.id"
            :label="item.label"
            :variant="tab === item.id ? 'soft' : 'ghost'"
            color="neutral"
            size="sm"
            @click="tab = item.id"
          />
        </div>

        <template v-if="tab === 'profile'">
          <dl class="space-y-ui-lg text-sm">
            <div class="flex justify-between gap-ui-lg">
              <dt class="text-muted">
                Joined
              </dt><dd>{{ date(member.joinedAt) }}</dd>
            </div><div class="flex justify-between gap-ui-lg">
              <dt class="text-muted">
                Last active
              </dt><dd>{{ date(member.lastActiveAt) }}</dd>
            </div><div class="flex justify-between gap-ui-lg">
              <dt class="text-muted">
                Added by
              </dt><dd>{{ member.invitedBy || 'Workspace creator' }}</dd>
            </div><div class="flex justify-between gap-ui-lg">
              <dt class="text-muted">
                Status
              </dt><dd>{{ member.suspendedAt ? 'Suspended' : member.userId ? 'Active' : 'Not signed in yet' }}</dd>
            </div>
          </dl>
          <UFormField label="Workspace role">
            <USelect
              v-if="canManage && member.role !== 'owner'"
              :model-value="member.role"
              :items="roles"
              :disabled="busy"
              class="w-full"
              @update:model-value="action(() => api.change(workspaceId, member.id, { role: $event as InviteRole }))"
            /><UBadge
              v-else
              color="neutral"
              variant="soft"
              class="capitalize"
            >
              {{ member.role }}
            </UBadge>
          </UFormField>
          <p class="text-xs text-muted leading-relaxed">
            Viewers can read. Members can edit where item permissions allow. Admins manage people and settings; restricted items still require access.
          </p>
          <div>
            <h3 class="text-sm font-medium">
              Groups
            </h3><p class="text-sm text-muted mt-ui-sm">
              {{ member.groups.map(item => item.name).join(', ') || 'No groups assigned' }}
            </p>
          </div>
          <div
            v-if="canManage"
            class="border-t border-muted pt-ui-xl flex flex-wrap gap-ui-sm"
          >
            <UButton
              :label="member.suspendedAt ? 'Restore access' : 'Suspend access'"
              color="neutral"
              variant="soft"
              :loading="busy"
              @click="action(() => api.change(workspaceId, member.id, { suspended: !member.suspendedAt }))"
            /><UButton
              label="Remove member"
              color="error"
              variant="ghost"
              @click="removing = true"
            />
          </div>
        </template>
        <template v-else-if="tab === 'access'">
          <UButton
            :label="previewVisibility ? 'Show all permissions' : 'Preview visible items'"
            icon="i-lucide-eye"
            color="neutral"
            variant="outline"
            :aria-pressed="previewVisibility"
            @click="previewVisibility = !previewVisibility"
          />
          <p class="text-sm text-muted">
            {{ previewVisibility ? `Showing what ${member.name || member.email} can see, limited to items you can also access. This does not sign you in as the member.` : 'Effective access includes groups and parent restrictions. Individual overrides take priority. A Viewer can never exceed view access.' }}
          </p>
          <UInput
            v-model="resourceQuery"
            icon="i-lucide-search"
            placeholder="Find an item or folder…"
            class="w-full"
            aria-label="Filter member resources"
          />
          <DataSkeleton
            v-if="status === 'idle' || status === 'pending'"
            label="Loading item permissions"
          />
          <DataRetry
            v-else-if="accessError"
            :feedback-keys="[`member-access:${workspaceId}:${member.id}`]"
            :on-retry="() => refresh()"
          />
          <div
            v-else
            class="divide-y divide-muted"
          >
            <div
              v-for="item in displayedResources"
              :key="item.id"
              class="py-ui-lg space-y-ui-md"
            >
              <div class="flex items-start gap-ui-sm">
                <UIcon
                  :name="item.kind === 'folder' ? 'i-lucide-folder' : 'i-lucide-file-text'"
                  class="size-ui-lg mt-ui-xs shrink-0 text-muted"
                /><div class="min-w-ui-zero flex-1">
                  <p class="text-sm font-medium truncate">
                    {{ item.title }}
                  </p><p class="text-xs text-muted mt-ui-xs capitalize">
                    {{ sourceLabels[item.source] }} · {{ item.mode }}
                  </p>
                  <p
                    v-if="item.kind === 'item' && item.folderId"
                    class="text-xs text-muted mt-ui-xs"
                  >
                    Folder limit: {{ item.parentLevel }}{{ member.role === 'viewer' ? ' · Viewer role limits this to read-only' : '' }}
                  </p>
                </div><UBadge
                  :color="item.level === 'none' ? 'warning' : 'neutral'"
                  variant="soft"
                >
                  {{ item.level === 'none' ? 'No access' : item.level }}
                </UBadge>
              </div>
              <div
                v-if="item.canManage && !previewVisibility"
                class="flex gap-ui-sm justify-end"
              >
                <UButton
                  v-if="canManage"
                  label="Override"
                  size="xs"
                  variant="ghost"
                  @click="start(item)"
                /><UButton
                  label="Document policy"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="policy = item"
                />
              </div>
              <div
                v-if="editing?.id === item.id && !previewVisibility"
                class="rounded-md bg-muted p-ui-md space-y-ui-md"
              >
                <USelect
                  v-model="level"
                  :items="[{ label: 'Use inherited / group access', value: 'inherit' }, { label: 'No access', value: 'none' }, { label: 'Can view', value: 'view' }, { label: 'Can comment', value: 'comment' }, { label: 'Can edit', value: 'edit' }]"
                  aria-label="Individual access"
                  class="w-full"
                />
                <UFormField
                  v-if="level !== 'inherit'"
                  label="Expires at (optional)"
                >
                  <UInput
                    v-model="expires"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
                <p class="text-xs text-muted">
                  Parent folder permits {{ item.parentLevel }}. An item cannot exceed its parent’s access.
                </p>
                <div class="flex justify-end gap-ui-sm">
                  <UButton
                    label="Cancel"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="editing = null"
                  /><UButton
                    label="Save access"
                    size="sm"
                    :loading="busy"
                    @click="grant"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <DataSkeleton
            v-if="historyStatus === 'idle' || historyStatus === 'pending'"
            label="Loading membership history"
          />
          <DataRetry
            v-else-if="historyError"
            :feedback-keys="[`member-history:${workspaceId}:${member.id}`]"
            :on-retry="() => refreshHistory()"
          />
          <div
            v-else
            class="divide-y divide-muted"
          >
            <div
              v-for="item in history.items"
              :key="item.id"
              class="py-ui-md"
            >
              <p class="text-sm">
                {{ item.actorName }} · {{ item.action.replaceAll('.', ' ').replaceAll('_', ' ') }}
              </p><p class="text-xs text-muted mt-ui-xs">
                {{ item.target }} · {{ date(item.createdAt) }}
              </p>
            </div><p
              v-if="!history.items.length"
              class="text-sm text-muted py-ui-xl"
            >
              No membership changes recorded.
            </p>
          </div>
          <UButton
            v-if="history.nextCursor"
            label="Load earlier changes"
            variant="ghost"
            color="neutral"
            :loading="busy"
            @click="moreHistory"
          />
        </template>
      </div>
    </template>
  </DetailPanel>
  <ResourceAccessPanel
    v-if="policy"
    :key="policy.id"
    :workspace-id="workspaceId"
    :kind="policy.kind"
    :resource-id="policy.id"
    @close="policy = null"
    @changed="refresh(); refreshHistory()"
  />
  <ConfirmationDialog
    v-model:open="removing"
    title="Remove member?"
    :description="`${member.email} will immediately lose access to this workspace.`"
    confirm-label="Remove member"
    :on-confirm="async () => { await api.remove(workspaceId, member.id); emit('changed'); open = false }"
  />
</template>
