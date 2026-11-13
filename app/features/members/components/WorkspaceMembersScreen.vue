<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import WorkspaceManagementPage from '~/features/workspaces/components/WorkspaceManagementPage.vue'
import SectionNavigation from '~/components/ui/SectionNavigation.vue'
import { useMemberDirectory } from '../composables/useMemberDirectory'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import MemberDetails from './MemberDetails.vue'
import MemberGroups from './MemberGroups.vue'
import AddMembers from './AddMembers.vue'

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { overview, workspaceLoading, workspaceError, refreshOverview, manager, writable, owner, canAdd, section, sections, query, role, status, group, directory, loadStatus, loadError, groups, groupsStatus, groupsError, selected, adding, detail, busy, error, results, bulkRole, roles, pendingRemoval, manageable, toggle, reload, bulk, more } = useMemberDirectory(workspaceId)

useFeedbackToast(error, { key: `member-action:${workspaceId}`, title: 'Unable to complete member changes' })
useFeedbackToast(loadError, { key: `member-directory:${workspaceId}`, title: 'Unable to load members', recovered: () => loadStatus.value === 'success', retry: reload })
useFeedbackToast(() => section.value === 'groups' ? groupsError.value : null, { key: `member-groups:${workspaceId}`, title: 'Unable to load groups', recovered: () => groupsStatus.value === 'success', retry: reload })
</script>

<template>
  <WorkspaceManagementPage
    :workspace-id="workspaceId"
    :workspace="overview?.workspace"
    title="Members"
    description="People, groups, and their document access."
    icon="i-lucide-users"
    :loading="workspaceLoading"
    :error="workspaceError ? errorMessage(workspaceError) : null"
    :on-retry="refreshOverview"
  >
    <template #navigation>
      <SectionNavigation
        v-model="section"
        :items="sections"
        label="Member categories"
      />
    </template>
    <div class="flex items-center justify-between gap-ui-lg">
      <div>
        <h2 class="text-base font-semibold">
          {{ section === 'people' ? 'Workspace members' : 'Member groups' }}
        </h2><p class="text-sm text-muted mt-ui-xs">
          {{ section === 'people' ? 'Manage membership, roles, and individual access here.' : 'Organize people to grant document access together.' }}
        </p>
      </div><UButton
        v-if="canAdd && section === 'people'"
        label="Add people"
        icon="i-lucide-user-plus"
        @click="adding = !adding"
      />
    </div>
    <AddMembers
      v-if="adding && canAdd && section === 'people'"
      :workspace-id="workspaceId"
      :owner="owner"
      :groups="groups"
      @close="adding = false"
      @added="results = $event; reload()"
    />
    <div
      v-if="results.length"
      class="rounded-md border border-muted p-ui-lg space-y-ui-sm"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium">
          Member results
        </h2><UButton
          icon="i-lucide-x"
          aria-label="Dismiss results"
          variant="ghost"
          color="neutral"
          @click="results = []"
        />
      </div>
      <p
        v-for="result in results"
        :key="result.email"
        class="text-sm break-words"
        :class="result.status === 'failed' ? 'text-error' : 'text-muted'"
      >
        {{ result.email }} — {{ result.message }}
      </p>
    </div>
    <DataRetry
      v-if="loadError && section === 'people'"
      :feedback-keys="[`member-directory:${workspaceId}`]"
      :on-retry="reload"
    />
    <DataSkeleton
      v-if="section === 'groups' && (groupsStatus === 'pending' || groupsStatus === 'idle')"
      label="Loading groups"
    />
    <DataRetry
      v-else-if="section === 'groups' && groupsError"
      :feedback-keys="[`member-groups:${workspaceId}`]"
      :on-retry="reload"
    />
    <MemberGroups
      v-else-if="section === 'groups'"
      :workspace-id="workspaceId"
      :groups="groups"
      :can-edit="owner && writable"
      @changed="reload"
    />
    <template v-else>
      <div class="flex flex-wrap gap-ui-sm">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search people…"
          aria-label="Search members"
          class="flex-1 min-w-ui-zero basis-ui-14xl"
        />
        <USelect
          v-model="role"
          :items="[{ label: 'All roles', value: 'all' }, { label: 'Owner', value: 'owner' }, { label: 'Admin', value: 'admin' }, { label: 'Member', value: 'member' }, { label: 'Viewer', value: 'viewer' }]"
          aria-label="Filter by role"
        />
        <USelect
          v-model="status"
          :items="[{ label: 'All statuses', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' }, { label: 'Not signed in', value: 'unregistered' }]"
          aria-label="Filter by status"
        />
        <USelect
          v-model="group"
          :items="[{ label: 'All groups', value: 'all' }, ...groups.map(item => ({ label: item.name, value: item.id }))]"
          aria-label="Filter by group"
        />
      </div>
      <div
        v-if="selected.length"
        class="flex flex-wrap items-center gap-ui-sm rounded-md bg-muted p-ui-md"
      >
        <span class="text-sm me-auto">{{ selected.length }} selected</span>
        <USelect
          v-model="bulkRole"
          :items="roles"
          aria-label="Bulk role"
        />
        <UButton
          label="Change role"
          variant="soft"
          :loading="busy"
          @click="bulk('role')"
        />
        <UButton
          label="Suspend"
          color="neutral"
          variant="ghost"
          :disabled="busy"
          @click="bulk('suspend')"
        />
        <UButton
          label="Restore"
          color="neutral"
          variant="ghost"
          :disabled="busy"
          @click="bulk('restore')"
        />
        <UButton
          label="Remove"
          color="error"
          variant="ghost"
          :disabled="busy"
          @click="pendingRemoval = true"
        />
      </div>
      <DataSkeleton
        v-if="loadStatus === 'pending' || loadStatus === 'idle'"
        label="Loading members"
      />
      <div
        v-else-if="directory.items.length"
        class="divide-y divide-muted"
      >
        <div class="flex items-center justify-between gap-ui-lg pb-ui-md text-xs text-muted">
          <span>{{ directory.total }} people</span><span>Role / status</span>
        </div>
        <div
          v-for="member in directory.items"
          :key="member.id"
          class="flex items-center gap-ui-md py-ui-lg"
        >
          <UCheckbox
            v-if="writable"
            :model-value="selected.includes(member.id)"
            :disabled="!manageable(member)"
            :aria-label="`Select ${member.email}`"
            @update:model-value="toggle(member.id, $event)"
          />
          <UAvatar
            :alt="member.name || member.email"
            :src="member.avatar || undefined"
            size="sm"
          />
          <button
            class="min-w-ui-zero flex-1 text-start disabled:cursor-default"
            :disabled="!manager"
            @click="detail = member"
          >
            <span class="block truncate text-sm font-medium text-highlighted">{{ member.name || member.email }}</span>
            <span class="block truncate text-xs text-muted mt-ui-xs">{{ member.email }}</span>
            <span
              v-if="member.groups.length"
              class="block truncate text-xs text-muted mt-ui-xs"
            >{{ member.groups.map(item => item.name).join(', ') }}</span>
          </button>
          <div class="flex flex-wrap justify-end items-center gap-ui-sm">
            <UBadge
              color="neutral"
              variant="soft"
              class="capitalize"
            >
              {{ member.role }}
            </UBadge>
            <UBadge
              v-if="member.suspendedAt"
              color="warning"
              variant="soft"
            >
              Suspended
            </UBadge>
            <span
              v-else-if="!member.userId"
              class="text-xs text-muted"
            >Not signed in</span>
            <UButton
              v-if="manager"
              icon="i-lucide-chevron-right"
              :aria-label="`Manage ${member.email}`"
              variant="ghost"
              color="neutral"
              @click="detail = member"
            />
          </div>
        </div>
      </div>
      <p
        v-else-if="!loadError"
        class="text-sm text-muted py-ui-3xl text-center"
      >
        No people match these filters.
      </p>
      <UButton
        v-if="directory.nextCursor"
        label="Load more members"
        variant="ghost"
        color="neutral"
        :loading="busy"
        @click="more"
      />
    </template>
    <MemberDetails
      v-if="detail"
      :key="detail.id"
      :member="detail"
      :workspace-id="workspaceId"
      :can-manage="manageable(detail)"
      :roles="roles"
      @close="detail = null"
      @changed="reload"
    />
    <ConfirmationDialog
      v-model:open="pendingRemoval"
      title="Remove selected members?"
      description="These people will immediately lose access to this workspace and its documents."
      confirm-label="Remove members"
      :on-confirm="() => bulk('remove')"
    />
  </WorkspaceManagementPage>
</template>
