<script setup lang="ts">
import WorkspaceFeatureScreen from '~/features/workspaces/components/WorkspaceFeatureScreen.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import { useApi } from '~/core/http/useApi'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data, itemsLoading, itemsError, refresh } = useWorkspace(workspaceId)
const api = useApi().items
const toast = useToast(), busy = ref<string | null>(null), search = ref('')
const archived = computed(() => (data.value?.items || []).filter(item => item.archivedAt && item.title.toLowerCase().includes(search.value.toLowerCase())))
const canRestore = computed(() => !!data.value && !data.value.workspace.archivedAt && allowsWorkspaceAction(data.value.workspace.role, data.value.workspace.settings, 'deleteContent'))
async function restore(id: string) {
  if (busy.value) {
    return
  }
  busy.value = id
  try {
    await api.archive(id, false)
    await refreshWorkspace(workspaceId)
    toast.add({ title: 'Item restored to active items', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to restore item', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <WorkspaceFeatureScreen
    :workspace-id="workspaceId"
    :workspace="data?.workspace"
    title="Archived items"
    description="Completed items stay readable here, separate from active work and Trash."
    icon="i-lucide-archive"
  >
    <UInput
      v-model="search"
      placeholder="Find an archived item…"
      aria-label="Search archived items"
      icon="i-lucide-search"
      class="w-full sm:max-w-panel-md"
    />
    <DataSkeleton
      v-if="itemsLoading"
      label="Loading archived items"
    />
    <DataRetry
      v-else-if="itemsError"
      :feedback-keys="[`workspaces:${workspaceId}:items`]"
      :on-retry="refresh"
    />
    <div
      v-else
      class="divide-y divide-muted border-t border-muted"
    >
      <div
        v-for="item in archived"
        :key="item.id"
        class="flex gap-ui-lg items-center py-ui-lg"
      >
        <span class="text-xl shrink-0">{{ item.icon || '📄' }}</span><NuxtLink
          :to="`/workspaces/${workspaceId}/items/${item.id}`"
          class="text-sm font-medium truncate flex-1 min-w-ui-zero"
        >{{ item.title }}</NuxtLink>
        <span class="text-xs text-muted hidden sm:block">{{ item.archivedAt ? formatRelativeTime(item.archivedAt) : '' }}</span>
        <UButton
          v-if="canRestore && item.accessLevel === 'edit'"
          label="Restore"
          icon="i-lucide-archive-restore"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="busy === item.id"
          :disabled="!!busy"
          @click="restore(item.id)"
        />
      </div>
      <p
        v-if="!archived.length"
        class="text-sm text-muted py-ui-5xl text-center"
      >
        {{ search ? 'No archived items match your search.' : 'No archived items yet. Archive an item from its actions menu.' }}
      </p>
    </div>
  </WorkspaceFeatureScreen>
</template>
