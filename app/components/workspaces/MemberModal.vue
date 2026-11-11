<script setup lang="ts">
import type { WorkspaceOverview, WorkspaceInvitation, InviteRole } from '#shared/types/workspace'
import { invitationInputSchema } from '#shared/validation/workspace'
import { workspaceService } from '~/services/workspaceService'

const props = defineProps<{ overview: WorkspaceOverview }>()
const open = defineModel<boolean>('open', { default: false })
const manager = computed(() => props.overview.workspace.role !== 'member')
const state = reactive({ email: '', role: 'member' as InviteRole })
const invitations = ref<WorkspaceInvitation[]>([])
const busy = ref(false)
const error = ref<string | null>(null)
const roles = [{ label: 'Member', value: 'member' }, { label: 'Admin', value: 'admin' }]
async function reload() {
  await refreshWorkspace(props.overview.workspace.id)
  if (manager.value) {
    invitations.value = (await workspaceService.invitations(props.overview.workspace.id)).data
  }
}
watch(open, async (value) => {
  if (value) {
    error.value = null
    try {
      await reload()
    } catch (cause) {
      error.value = errorMessage(cause)
    }
  }
})
async function action(work: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await work()
    await reload()
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
async function invite() {
  await action(async () => {
    const input = invitationInputSchema.parse(state)
    await workspaceService.invite(props.overview.workspace.id, input.email, input.role)
    state.email = ''
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Workspace members"
    description="Members can access every page and folder in this workspace."
  >
    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="error"
          :description="error"
          color="error"
        />
        <UForm
          v-if="manager"
          :schema="invitationInputSchema"
          :state="state"
          class="space-y-3"
          @submit="invite"
        >
          <UFormField
            label="Invite by email"
            name="email"
          >
            <UInput
              v-model="state.email"
              type="email"
              placeholder="colleague@company.com"
              class="w-full"
            />
          </UFormField>
          <div class="flex gap-2">
            <USelect
              v-model="state.role"
              :items="roles"
              aria-label="Invitation role"
              class="flex-1"
            /><UButton
              type="submit"
              label="Invite to workspace"
              color="neutral"
              :loading="busy"
            />
          </div>
          <p class="text-xs text-muted">
            Invitations appear on the recipient's workspace home after Microsoft sign-in. They expire in 7 days.
          </p>
        </UForm>
        <section class="space-y-3">
          <h3 class="text-sm font-semibold">
            Members · {{ overview.members.length }}
          </h3>
          <div
            v-for="member in overview.members"
            :key="member.userId"
            class="flex items-center gap-3"
          >
            <UAvatar
              :alt="member.name || member.email"
              :src="member.avatar || undefined"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ member.name || member.email }}
              </p><p class="text-xs text-muted truncate">
                {{ member.email }}
              </p>
            </div>
            <UBadge
              v-if="member.role === 'owner' || !manager"
              color="neutral"
              variant="soft"
            >
              {{ member.role }}
            </UBadge>
            <template v-else>
              <USelect
                :model-value="member.role"
                :items="roles"
                :disabled="busy"
                :aria-label="`Role for ${member.email}`"
                class="w-28"
                @update:model-value="action(() => workspaceService.changeRole(overview.workspace.id, member.userId, $event as InviteRole))"
              />
              <UButton
                icon="i-lucide-user-minus"
                :aria-label="`Remove ${member.email}`"
                color="error"
                variant="ghost"
                :disabled="busy"
                @click="action(() => workspaceService.removeMember(overview.workspace.id, member.userId))"
              />
            </template>
          </div>
        </section>
        <section
          v-if="manager && invitations.length"
          class="space-y-3"
        >
          <h3 class="text-sm font-semibold">
            Pending invitations
          </h3>
          <div
            v-for="invitation in invitations"
            :key="invitation.id"
            class="flex items-center gap-3 text-sm"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate">
                {{ invitation.email }}
              </p><p class="text-xs text-muted">
                {{ invitation.role }} · Pending
              </p>
            </div>
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              :disabled="busy"
              @click="action(() => workspaceService.cancelInvitation(overview.workspace.id, invitation.id))"
            />
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>
