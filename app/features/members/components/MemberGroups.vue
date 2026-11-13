<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import type { MemberGroup } from '#shared/contracts/member'
import { groupInputSchema } from '#shared/validation/member'
import { useApi } from '~/core/http/useApi'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'

const { workspaceId, groups, canEdit } = defineProps<{
  workspaceId: string
  groups: MemberGroup[]
  canEdit: boolean
}>()
const emit = defineEmits<{
  changed: [
  ]
}>()
const api = useApi().members
const { data: overview } = useWorkspace(workspaceId)
const editing = ref(false), groupId = ref<string | null>(null), busy = ref(false), error = ref(''), deleting = ref<MemberGroup | null>(null)
const state = reactive({ name: '', description: '', memberIds: [] as string[] })
const removalOpen = computed({ get: () => !!deleting.value, set: (value: boolean) => {
  if (!value) {
    deleting.value = null
  }
} })
function edit(group?: MemberGroup) {
  groupId.value = group?.id || null
  Object.assign(state, { name: group?.name || '', description: group?.description || '', memberIds: [...(group?.memberIds || [])] })
  editing.value = true
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api.saveGroup(workspaceId, groupId.value, groupInputSchema.parse(state))
    editing.value = false
    emit('changed')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
async function remove() {
  if (!deleting.value) {
    return
  }
  await api.deleteGroup(workspaceId, deleting.value.id)
  emit('changed')
}

useFeedbackToast(error, { key: `member-group-save:${workspaceId}`, title: 'Unable to save group' })
</script>

<template>
  <section class="space-y-ui-xl">
    <div class="flex items-start justify-between gap-ui-lg">
      <p class="text-sm text-muted">
        Grant access to a team once, then manage its membership here. Only the workspace owner can change groups.
      </p><UButton
        v-if="canEdit"
        label="New group"
        icon="i-lucide-plus"
        variant="soft"
        @click="edit()"
      />
    </div>

    <div
      v-if="editing"
      class="rounded-md border border-muted p-ui-xl space-y-ui-lg"
    >
      <UFormField label="Group name">
        <UInput
          v-model="state.name"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Description">
        <UTextarea
          v-model="state.description"
          class="w-full"
        />
      </UFormField>
      <UFormField label="People">
        <USelect
          v-model="state.memberIds"
          :items="(overview?.members || []).map(item => ({ label: item.name || item.email, value: item.id }))"
          multiple
          placeholder="Choose members"
          class="w-full"
        />
      </UFormField>
      <div class="flex justify-end gap-ui-sm">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="editing = false"
        /><UButton
          label="Save group"
          :loading="busy"
          @click="save"
        />
      </div>
    </div>
    <div class="divide-y divide-muted">
      <div
        v-for="group in groups"
        :key="group.id"
        class="flex items-center justify-between gap-ui-lg py-ui-lg"
      >
        <div class="min-w-ui-zero">
          <h3 class="text-sm font-medium truncate">
            {{ group.name }}
          </h3><p class="text-xs text-muted mt-ui-xs">
            {{ group.description || `${group.memberIds.length} members` }}
          </p>
        </div><UBadge
          color="neutral"
          variant="soft"
        >
          {{ group.memberIds.length }}
        </UBadge><div
          v-if="canEdit"
          class="flex gap-ui-xs"
        >
          <UButton
            icon="i-lucide-pencil"
            aria-label="Edit group"
            color="neutral"
            variant="ghost"
            @click="edit(group)"
          /><UButton
            icon="i-lucide-trash-2"
            aria-label="Delete group"
            color="error"
            variant="ghost"
            @click="deleting = group"
          />
        </div>
      </div>
    </div>
    <p
      v-if="!groups.length && !editing"
      class="text-sm text-muted py-ui-3xl text-center"
    >
      No groups yet. Organize departments or project teams here.
    </p>
    <ConfirmationDialog
      v-model:open="removalOpen"
      title="Delete group?"
      description="Group access grants will be removed. People keep their workspace membership and individual permissions."
      confirm-label="Delete group"
      :on-confirm="remove"
    />
  </section>
</template>
