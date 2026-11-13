<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import type { MemberAddInput, MemberAddResult, MemberGroup } from '#shared/contracts/member'
import { addMembersSchema } from '#shared/validation/member'
import { useApi } from '~/core/http/useApi'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'

const { workspaceId, owner, groups } = defineProps<{
  workspaceId: string
  owner: boolean
  groups: MemberGroup[]
}>()
const emit = defineEmits<{
  close: [
  ]
  added: [
        results: MemberAddResult[]
  ]
}>()
const api = useApi().members
const { data: overview } = useWorkspace(workspaceId)
const emails = ref(''), busy = ref(false), error = ref('')
const input = reactive<MemberAddInput>({ emails: [], role: 'member', groupIds: [], grants: [] })
const resource = ref('none'), level = ref<'view' | 'comment' | 'edit' | 'none'>('view')
const resources = computed(() => [
  { label: 'Choose a document or folder', value: 'none' },
  ...(overview.value?.folders || []).filter(item => item.canManageAccess).map(item => ({ label: `Folder · ${item.name}`, value: `folder:${item.id}` })),
  ...(overview.value?.pages || []).filter(item => item.canManageAccess).map(item => ({ label: `Page · ${item.title}`, value: `page:${item.id}` }))
])
function addGrant() {
  if (resource.value === 'none') {
    return
  }
  const [kind, resourceId] = resource.value.split(':') as [
        'folder' | 'page',
        string
  ]
  input.grants = [...input.grants.filter(item => item.resourceId !== resourceId), { kind, resourceId, level: level.value, expiresAt: null }]
  resource.value = 'none'
}
async function submit() {
  busy.value = true
  error.value = ''
  try {
    const body = addMembersSchema.parse({ ...input, emails: emails.value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean) })
    emit('added', (await api.add(workspaceId, body)).data)
    emit('close')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

useFeedbackToast(error, { key: `member-add:${workspaceId}`, title: 'Unable to add people' })
</script>

<template>
  <section
    id="invite"
    class="rounded-md border border-muted p-ui-xl space-y-ui-lg"
  >
    <div class="flex items-start justify-between gap-ui-md">
      <div>
        <h2 class="text-base font-semibold">
          Add people
        </h2><p class="text-sm text-muted mt-ui-xs">
          Access is granted immediately. New users join automatically when they sign in with the same email.
        </p>
      </div><UButton
        icon="i-lucide-x"
        aria-label="Close add people"
        variant="ghost"
        color="neutral"
        @click="emit('close')"
      />
    </div>

    <UFormField
      label="Email addresses"
      description="Separate addresses with commas or new lines. Up to 100 at once."
    >
      <UTextarea
        v-model="emails"
        placeholder="alex@company.com, sam@company.com"
        class="w-full"
        :rows="3"
      />
    </UFormField>
    <div class="flex flex-wrap gap-ui-lg">
      <UFormField label="Workspace role">
        <USelect
          v-model="input.role"
          :items="[{ label: 'Member', value: 'member' }, { label: 'Viewer', value: 'viewer' }, ...(owner ? [{ label: 'Admin', value: 'admin' }] : [])]"
        />
      </UFormField>
      <UFormField
        v-if="owner && groups.length"
        label="Groups"
      >
        <USelect
          v-model="input.groupIds"
          :items="groups.map(item => ({ label: item.name, value: item.id }))"
          multiple
          placeholder="Choose groups"
          class="min-w-ui-14xl"
        />
      </UFormField>
    </div>
    <div class="space-y-ui-sm">
      <p class="text-sm font-medium">
        Document access <span class="text-muted font-normal">· optional</span>
      </p>
      <p class="text-xs text-muted">
        Set an initial override. A restricted parent folder still limits its pages.
      </p>
      <div class="flex flex-wrap gap-ui-sm">
        <USelect
          v-model="resource"
          :items="resources"
          aria-label="Initial resource"
          class="flex-1 min-w-ui-zero"
        /><USelect
          v-model="level"
          :items="[{ label: 'No access', value: 'none' }, { label: 'View', value: 'view' }, { label: 'Comment', value: 'comment' }, { label: 'Edit', value: 'edit' }]"
          aria-label="Initial access level"
        /><UButton
          label="Add override"
          variant="soft"
          :disabled="resource === 'none'"
          @click="addGrant"
        />
      </div>
      <div
        v-for="grant in input.grants"
        :key="grant.resourceId"
        class="flex items-center justify-between gap-ui-sm text-sm"
      >
        <span class="truncate">{{ resources.find(item => item.value === `${grant.kind}:${grant.resourceId}`)?.label }} · {{ grant.level }}</span><UButton
          icon="i-lucide-x"
          color="error"
          variant="ghost"
          aria-label="Remove override"
          @click="input.grants = input.grants.filter(item => item.resourceId !== grant.resourceId)"
        />
      </div>
    </div>
    <div class="flex justify-end">
      <UButton
        label="Add to workspace"
        icon="i-lucide-user-plus"
        :disabled="!emails.trim()"
        :loading="busy"
        @click="submit"
      />
    </div>
  </section>
</template>
