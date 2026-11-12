<script setup lang="ts">
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import AppHeader from '~/components/shell/AppHeader.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import type { InviteRole } from '#shared/contracts/workspace'
import { invitationInputSchema } from '#shared/validation/workspace'

const { invitations: invitationApi, memberships: membershipApi } = useApi()

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { data: overview, loading, error: workspaceError, refresh, membersLoading, membersError } = useWorkspace(workspaceId)
const manager = computed(() => overview.value?.workspace.role === 'owner' || overview.value?.workspace.role === 'admin')
const breadcrumbs = computed(() => [
  { label: overview.value?.workspace.name || 'Workspace', emoji: overview.value?.workspace.icon, icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
  { label: 'Members', icon: 'i-lucide-users' }
])
const state = reactive({ email: '', role: 'member' as InviteRole })
const { data: invitations, error: loadError, refresh: refreshInvitations, status: invitationStatus } = useLazyAsyncData(
  workspaceKeys.invitations(workspaceId),
  async () => manager.value ? (await invitationApi.list(workspaceId)).data : [],
  { server: false, default: () => [], watch: [manager] }
)
const busy = ref(false)
const error = ref<string | null>(null)
const roles = [{ label: 'Member', value: 'member' }, { label: 'Admin', value: 'admin' }]
async function reload() {
  error.value = null
  try {
    await Promise.all([refreshWorkspace(workspaceId), refreshInvitations()])
  } catch (cause) {
    error.value = errorMessage(cause)
  }
}
async function action(work: () => Promise<unknown>) {
  if (busy.value || !manager.value) {
    return
  }
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
    await invitationApi.invite(workspaceId, input.email, input.role)
    state.email = ''
  })
}
</script>

<template>
  <div
    v-if="loading"
    class="workspace-content workspace-content-start"
  >
    <DataSkeleton
      kind="heading"
      label="Loading members heading"
    /><DataSkeleton
      class="mt-ui-5xl"
      label="Loading members"
    />
  </div>
  <UAlert
    v-else-if="workspaceError"
    title="Unable to load workspace"
    color="error"
    :actions="[{ label: 'Retry', onClick: refresh }]"
  />
  <div
    v-else-if="overview"
    class="pb-ui-7xl app-enter"
  >
    <AppHeader>
      <template #left>
        <PageBreadcrumbs :items="breadcrumbs" />
      </template>
    </AppHeader>
    <PageContent>
      <PageHeading
        title="Members"
        description="Everyone here can access all pages and folders in this workspace."
      >
        <template #icon>
          <UIcon
            name="i-lucide-users"
            class="size-ui-3xl"
          />
        </template>
      </PageHeading>
      <UAlert
        v-if="error || loadError"
        :title="error ? 'Unable to update members' : 'Unable to load invitations'"
        :description="error || errorMessage(loadError)"
        color="error"
      >
        <template #actions>
          <UButton
            label="Retry"
            color="neutral"
            variant="outline"
            :disabled="busy"
            @click="reload"
          />
        </template>
      </UAlert>
      <section
        v-if="manager"
        id="invite"
        aria-label="Invite people"
        class="border-t border-muted pt-ui-2xl space-y-ui-xl scroll-mt-20"
      >
        <div>
          <h2 class="text-sm font-semibold">
            Invite people
          </h2><p class="text-sm text-muted mt-ui-xs">
            Give your team access to every page and folder in this workspace.
          </p>
        </div>
        <UForm
          :schema="invitationInputSchema"
          :state="state"
          class="space-y-ui-md"
          @submit="invite"
        >
          <div class="flex flex-wrap items-end gap-ui-md">
            <UFormField
              label="Invite by email"
              name="email"
              class="min-w-ui-zero flex-1 basis-ui-15xl"
              required
            >
              <UInput
                v-model="state.email"
                type="email"
                icon="i-lucide-mail"
                placeholder="colleague@company.com"
                :disabled="busy"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Role"
              name="role"
            >
              <USelect
                v-model="state.role"
                :items="roles"
                aria-label="Invitation role"
                :disabled="busy"
                class="w-ui-11xl"
              />
            </UFormField>
            <UButton
              type="submit"
              label="Invite to workspace"
              icon="i-lucide-user-plus"
              :loading="busy"
            />
          </div>
          <p class="text-xs text-muted leading-relaxed">
            Invitations appear on the recipient's workspace home after Microsoft sign-in. They expire in 7 days.
          </p>
        </UForm>
      </section>
      <section
        aria-label="Workspace members"
        class="space-y-ui-md border-t border-muted pt-ui-2xl"
      >
        <h2 class="text-sm font-semibold">
          Members <span v-if="!membersLoading">· {{ overview.members.length }}</span>
        </h2>
        <DataSkeleton
          v-if="membersLoading"
          label="Loading workspace members"
        />
        <UAlert
          v-else-if="membersError"
          title="Unable to load members"
          color="error"
          :actions="[{ label: 'Retry', onClick: reload }]"
        />
        <div
          v-for="member in overview.members"
          :key="member.userId"
          class="flex items-center gap-ui-md rounded-md py-ui-md border-b border-muted hover:bg-muted/60 transition-colors"
        >
          <UAvatar
            :alt="member.name || member.email"
            :src="member.avatar || undefined"
            class="bg-primary/10 text-primary"
          />
          <div class="flex-1 min-w-ui-zero">
            <p class="text-sm font-medium truncate">
              {{ member.name || member.email }}
            </p><p class="text-xs text-muted truncate">
              {{ member.email }}
            </p>
          </div>
          <UBadge
            v-if="member.role === 'owner' || !manager"
            :color="member.role === 'owner' ? 'primary' : 'neutral'"
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
              class="w-ui-11xl"
              @update:model-value="action(() => membershipApi.changeRole(workspaceId, member.userId, $event as InviteRole))"
            />
            <UButton
              icon="i-lucide-user-minus"
              :aria-label="`Remove ${member.email}`"
              color="error"
              variant="ghost"
              :disabled="busy"
              @click="action(() => membershipApi.remove(workspaceId, member.userId))"
            />
          </template>
        </div>
      </section>
      <DataSkeleton
        v-if="manager && (invitationStatus === 'pending' || invitationStatus === 'idle')"
        label="Loading pending invitations"
        :rows="2"
      />
      <section
        v-if="manager && invitations.length"
        aria-label="Pending invitations"
        class="space-y-ui-md border-t border-muted pt-ui-2xl"
      >
        <h2 class="text-sm font-semibold">
          Pending invitations
        </h2>
        <div
          v-for="invitation in invitations"
          :key="invitation.id"
          class="flex flex-wrap items-center gap-ui-md text-sm border-b border-muted py-ui-md"
        >
          <div class="min-w-ui-zero flex-1">
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
            @click="action(() => invitationApi.cancel(workspaceId, invitation.id))"
          />
        </div>
      </section>
    </PageContent>
  </div>
</template>
