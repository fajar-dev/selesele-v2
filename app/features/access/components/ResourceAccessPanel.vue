<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import type { ResourceKind, AccessGrant, ResourceMode, AccessLevel } from '#shared/kernel/access'
import { useApi } from '~/core/http/useApi'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import DetailPanel from '~/components/ui/DetailPanel.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'

const { workspaceId, kind, resourceId } = defineProps<{
  workspaceId: string
  kind: ResourceKind
  resourceId: string
}>()
const emit = defineEmits<{
  close: [
  ]
  changed: [
  ]
}>()
const api = useApi()
const open = ref(true), busy = ref(false), error = ref(''), mode = ref<ResourceMode>('inherit'), grants = ref<AccessGrant[]>([]), subject = ref('choose'), grantLevel = ref<AccessLevel>('view')
watch(open, (value) => {
  if (!value) {
    emit('close')
  }
})
const { data: overview } = useWorkspace(workspaceId)
const { data: groups, error: groupsError, status: groupsStatus, refresh: refreshGroups } = useLazyAsyncData(`member-groups:${workspaceId}`, async () => (await api.members.groups(workspaceId)).data, { server: false, default: () => [] })
const { data: policy, status, error: loadError, refresh: refreshPolicy } = useLazyAsyncData(`resource-policy:${kind}:${resourceId}`, async () => (await api.access.get(workspaceId, kind, resourceId)).data, { server: false })
watch(policy, (value) => {
  if (value) {
    mode.value = value.mode
    grants.value = value.grants.map(item => ({ ...item }))
  }
}, { immediate: true })
const subjects = computed(() => [{ label: 'Choose a person or group', value: 'choose' }, ...(overview.value?.members || []).filter(item => item.role !== 'owner').map(item => ({ label: item.name || item.email, value: `member:${item.id}` })), ...groups.value.map(item => ({ label: `Group · ${item.name}`, value: `group:${item.id}` }))])
const levels = [{ label: 'No access', value: 'none' }, { label: 'Can view', value: 'view' }, { label: 'Can comment', value: 'comment' }, { label: 'Can edit', value: 'edit' }]
function add() {
  error.value = ''
  if (subject.value === 'choose') {
    return
  }
  const [type, id] = subject.value.split(':')
  if (grants.value.some(item => type === 'member' ? item.memberId === id : item.groupId === id)) {
    error.value = 'This person or group already has an override'
    return
  }
  grants.value.push({ id: crypto.randomUUID(), memberId: type === 'member' ? id! : null, groupId: type === 'group' ? id! : null, level: grantLevel.value, expiresAt: null })
  subject.value = 'choose'
  error.value = ''
}
function label(grant: AccessGrant) {
  return subjects.value.find(item => item.value === `${grant.memberId ? 'member' : 'group'}:${grant.memberId || grant.groupId}`)?.label || 'Removed member or group'
}
function localDate(value: string | null) {
  return value ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
}
function expiry(grant: AccessGrant, value: string | number) {
  grant.expiresAt = value ? new Date(value).toISOString() : null
}
async function save() {
  if (busy.value) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    await api.access.save(workspaceId, kind, resourceId, { mode: mode.value, grants: grants.value })
    await refreshWorkspace(workspaceId)
    emit('changed')
    open.value = false
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

useFeedbackToast(loadError, { key: `resource-policy:${kind}:${resourceId}`, title: 'Unable to load document access', recovered: () => status.value === 'success', retry: () => refreshPolicy() })
useFeedbackToast(error, { key: `resource-policy:${kind}:${resourceId}:save`, title: 'Unable to update access' })
useFeedbackToast(groupsError, { key: `member-groups:${workspaceId}`, title: 'Unable to load groups', recovered: () => groupsStatus.value === 'success', retry: () => refreshGroups() })
</script>

<template>
  <DetailPanel
    v-model:open="open"
    title="Document access"
    description="Manage access for people and groups"
    icon="i-lucide-shield-check"
    wide
  >
    <template #body>
      <div class="p-ui-xl space-y-ui-xl">
        <DataSkeleton
          v-if="status==='idle' || status==='pending'"
          label="Loading access policy"
        />
        <DataRetry
          v-else-if="loadError"
          :feedback-keys="[`resource-policy:${kind}:${resourceId}`]"
          :on-retry="() => refreshPolicy()"
        />
        <template v-else-if="policy">
          <div>
            <h2 class="text-base font-semibold break-words">
              {{ policy.title }}
            </h2><p class="text-sm text-muted mt-ui-sm">
              The owner always has full access. Individual overrides take priority over groups. Page access cannot exceed its parent folder.
            </p>
          </div>

          <UFormField label="Default access">
            <USelect
              v-model="mode"
              :items="[{ label: 'Inherit from workspace / parent folder', value: 'inherit' }, { label: 'Restricted — only specified people and groups', value: 'restricted' }]"
              class="w-full"
            />
          </UFormField>
          <p class="text-xs text-muted">
            {{ mode==='restricted'?'Other people, including admins, cannot see this document.':'People inherit their workspace role and any parent restrictions.' }}
          </p>
          <div class="border-t border-muted pt-ui-lg space-y-ui-md">
            <h3 class="text-sm font-medium">
              People and groups
            </h3><USelect
              v-model="subject"
              :items="subjects"
              class="w-full"
              aria-label="Choose access subject"
            /><div class="flex gap-ui-sm">
              <USelect
                v-model="grantLevel"
                :items="levels"
                class="flex-1"
                aria-label="New access level"
              /><UButton
                label="Add"
                :disabled="subject==='choose'"
                @click="add"
              />
            </div>
          </div>
          <div class="divide-y divide-muted">
            <div
              v-for="grant in grants"
              :key="grant.id"
              class="py-ui-lg space-y-ui-md"
            >
              <div class="flex items-center justify-between gap-ui-sm">
                <span class="text-sm font-medium truncate">{{ label(grant) }}</span><UButton
                  icon="i-lucide-x"
                  color="error"
                  variant="ghost"
                  aria-label="Remove access override"
                  @click="grants=grants.filter(item => item.id!==grant.id)"
                />
              </div><USelect
                v-model="grant.level"
                :items="levels"
                class="w-full"
                aria-label="Access level"
              /><UFormField label="Expires at (optional)">
                <UInput
                  :model-value="localDate(grant.expiresAt)"
                  type="datetime-local"
                  class="w-full"
                  @update:model-value="expiry(grant, $event)"
                />
              </UFormField>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-ui-sm w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="open=false"
        /><UButton
          label="Save access"
          :loading="busy"
          :disabled="!policy || !!overview?.workspace.archivedAt"
          @click="save"
        />
      </div>
    </template>
  </DetailPanel>
</template>
