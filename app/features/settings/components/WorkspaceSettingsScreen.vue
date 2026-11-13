<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import WorkspaceManagementScreen from '~/features/workspaces/components/WorkspaceManagementScreen.vue'
import SectionNavigation from '~/components/ui/SectionNavigation.vue'
import { useWorkspaceActions } from '~/features/workspaces/composables/useWorkspaceActions'
import { useWorkspaceSettings } from '~/features/settings/composables/useWorkspaceSettings'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import WorkspaceGeneralSettings from './sections/WorkspaceGeneralSettings.vue'
import WorkspacePermissionSettings from './sections/WorkspacePermissionSettings.vue'
import WorkspaceNotificationSettings from './sections/WorkspaceNotificationSettings.vue'
import WorkspaceActivitySettings from './sections/WorkspaceActivitySettings.vue'
import WorkspaceDataSettings from './sections/WorkspaceDataSettings.vue'
import WorkspaceOwnershipSettings from './sections/WorkspaceOwnershipSettings.vue'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data, loading, error: workspaceError, refresh } = useWorkspace(workspaceId)
const manager = computed(() => !!data.value && ['owner', 'admin'].includes(data.value.workspace.role))
const { remove } = useWorkspaceActions(workspaceId)
const tab = ref('general')
const { query, draft, notifications, busy, activity, usage, save, saveNotifications, moreActivity, exportWorkspace, lifecycle } = useWorkspaceSettings(workspaceId, manager, tab)
const tabs = computed(() => [
  { key: 'general', label: 'General', icon: 'i-lucide-settings-2' },
  ...(manager.value ? [{ key: 'permissions', label: 'Workspace rules', icon: 'i-lucide-shield-check' }] : []),
  { key: 'notifications', label: 'Notifications', icon: 'i-lucide-bell' },
  ...(manager.value ? [{ key: 'activity', label: 'Activity log', icon: 'i-lucide-history' }, { key: 'data', label: 'Data & recovery', icon: 'i-lucide-database' }] : []),
  { key: 'ownership', label: 'Lifecycle', icon: 'i-lucide-key-round' }
])
watch(tabs, (items) => {
  if (!items.some(item => item.key === tab.value)) {
    tab.value = 'general'
  }
})
const pending = computed(() => query.status.value === 'idle' || query.status.value === 'pending')
useFeedbackToast(query.error, { key: `workspace-settings:${workspaceId}`, title: 'Unable to load settings', recovered: () => query.status.value === 'success', retry: () => query.refresh() })
</script>

<template>
  <WorkspaceManagementScreen
    :workspace-id="workspaceId"
    :workspace="data?.workspace"
    title="Settings"
    description="Workspace identity, rules, preferences, and lifecycle."
    icon="i-lucide-settings-2"
    :loading="loading"
    :error="workspaceError ? errorMessage(workspaceError) : null"
    :on-retry="refresh"
  >
    <template #navigation>
      <SectionNavigation
        v-model="tab"
        :items="tabs"
        label="Settings categories"
      />
    </template>

    <DataSkeleton
      v-if="pending"
      label="Loading settings"
    />
    <DataRetry
      v-else-if="query.error.value"
      :feedback-keys="[`workspace-settings:${workspaceId}`]"
      :on-retry="() => query.refresh()"
    />
    <template v-else-if="data">
      <WorkspaceGeneralSettings
        v-if="tab === 'general'"
        v-model:settings="draft"
        :workspace-id="workspaceId"
        :overview="data"
        :manager="manager"
        :busy="busy"
        :on-save="() => save({ homeItemId: draft.homeItemId })"
      />
      <WorkspacePermissionSettings
        v-else-if="tab === 'permissions' && manager"
        v-model="draft"
        :manager="manager"
        :busy="busy"
        :on-save="() => save({ permissions: draft.permissions })"
      />
      <WorkspaceNotificationSettings
        v-else-if="tab === 'notifications'"
        v-model="notifications"
        :busy="busy"
        :on-save="saveNotifications"
      />
      <WorkspaceActivitySettings
        v-else-if="tab === 'activity' && manager"
        :workspace-id="workspaceId"
        :activity="activity.data.value"
        :loading="activity.status.value === 'pending'"
        :error="activity.error.value ? errorMessage(activity.error.value) : null"
        :busy="busy"
        :on-more="moreActivity"
        :on-retry="activity.refresh"
      />
      <WorkspaceDataSettings
        v-else-if="tab === 'data' && manager"
        v-model="draft"
        :workspace-id="workspaceId"
        :usage="usage.data.value"
        :loading="usage.status.value === 'pending'"
        :error="usage.error.value ? errorMessage(usage.error.value) : null"
        :busy="busy"
        :on-save="() => save({ trashRetentionDays: draft.trashRetentionDays })"
        :on-export="exportWorkspace"
        :on-retry="usage.refresh"
      />
      <WorkspaceOwnershipSettings
        v-else-if="tab === 'ownership'"
        :overview="data"
        :busy="busy"
        :on-action="lifecycle"
        :on-delete="remove"
      />
    </template>
  </WorkspaceManagementScreen>
</template>
