<script setup lang="ts">
import PageSection from '~/components/ui/PageSection.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import { useAuth } from '~/features/auth/composables/useAuth'

const props = defineProps<{
  overview: WorkspaceOverview
  busy: boolean
  onAction: (action: 'archive' | 'unarchive' | 'transfer' | 'leave', target?: string) => Promise<void>
  onDelete: () => Promise<void>
}>()
const { state: auth } = useAuth()
const owner = computed(() => props.overview.workspace.role === 'owner')
const target = ref('')
const members = computed(() => props.overview.members.filter((member): member is typeof member & {
  userId: string
} => !!member.userId && !member.suspendedAt && member.userId !== auth.user?.id).map(member => ({ label: member.name || member.email, value: member.userId })))
const confirm = ref<'archive' | 'unarchive' | 'transfer' | 'leave' | 'delete' | null>(null)
const open = computed({ get: () => confirm.value !== null, set: (value: boolean) => {
  if (!value) {
    confirm.value = null
  }
} })
const copy = computed(() => ({
  archive: { title: 'Archive workspace', description: 'Members can still read documents they have access to. Editing, comments, and content changes are disabled until the workspace is restored.', label: 'Archive workspace' },
  unarchive: { title: 'Restore workspace', description: 'Allow your team to edit pages and collaborate again.', label: 'Restore workspace' },
  transfer: { title: 'Transfer ownership', description: 'The selected member becomes the owner. You remain an admin and lose owner-only controls.', label: 'Transfer ownership' },
  leave: { title: 'Leave workspace', description: 'You will lose access to pages and discussions. A teammate with permission to add people can grant access again.', label: 'Leave workspace' },
  delete: { title: 'Delete workspace', description: 'All members will lose access. The workspace will move to Trash and can be restored by its owner.', label: 'Delete workspace' }
})[confirm.value || 'archive'])
async function perform() {
  if (confirm.value === 'delete') {
    await props.onDelete()
  } else if (confirm.value) {
    await props.onAction(confirm.value, target.value || undefined)
  }
}
</script>

<template>
  <div class="space-y-ui-6xl">
    <PageSection
      v-if="owner"
      :title="overview.workspace.archivedAt ? 'Restore workspace' : 'Archive workspace'"
      description="Keep completed work available to read without allowing further edits. You can restore the workspace at any time."
    >
      <UButton
        :label="overview.workspace.archivedAt ? 'Restore workspace' : 'Archive workspace'"
        icon="i-lucide-archive"
        color="neutral"
        variant="outline"
        :loading="busy"
        @click="confirm = overview.workspace.archivedAt ? 'unarchive' : 'archive'"
      />
    </PageSection>
    <PageSection
      v-if="owner"
      title="Transfer ownership"
      description="Hand the workspace over to another current member. You will remain an admin."
    >
      <div class="flex flex-wrap gap-ui-md">
        <USelect
          v-model="target"
          :items="members"
          placeholder="Select a member"
          aria-label="New workspace owner"
          class="w-full sm:w-ui-17xl"
        /><UButton
          label="Transfer ownership"
          color="neutral"
          variant="outline"
          :disabled="!target || busy"
          @click="confirm = 'transfer'"
        />
      </div>
      <p
        v-if="!members.length"
        class="text-sm text-muted"
      >
        Invite another member before transferring ownership.
      </p>
    </PageSection>
    <PageSection
      title="Leave workspace"
      :description="owner ? 'Transfer ownership to another member before leaving.' : 'Leaving removes your access to workspace content and discussions.'"
    >
      <UButton
        label="Leave workspace"
        color="error"
        variant="outline"
        :disabled="owner || busy"
        @click="confirm = 'leave'"
      />
    </PageSection>
    <PageSection
      v-if="owner"
      title="Delete workspace"
      description="Remove access for everyone and move the workspace to Trash."
    >
      <UButton
        label="Delete workspace"
        color="error"
        variant="outline"
        :loading="busy"
        @click="confirm = 'delete'"
      />
    </PageSection>
    <ConfirmationDialog
      v-model:open="open"
      :title="copy.title"
      :description="copy.description"
      :confirm-label="copy.label"
      :on-confirm="perform"
    />
  </div>
</template>
