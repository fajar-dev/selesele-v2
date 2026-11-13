<script setup lang="ts">
import WorkspaceFeaturePage from '~/features/workspaces/components/WorkspaceFeaturePage.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import { useApi } from '~/core/http/useApi'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data, pagesLoading, pagesError, refresh } = useWorkspace(workspaceId)
const api = useApi().pages
const toast = useToast(), busy = ref<string | null>(null), search = ref('')
const archived = computed(() => (data.value?.pages || []).filter(page => page.archivedAt && page.title.toLowerCase().includes(search.value.toLowerCase())))
const canRestore = computed(() => !!data.value && !data.value.workspace.archivedAt && allowsWorkspaceAction(data.value.workspace.role, data.value.workspace.settings, 'deleteContent'))
async function restore(id: string) {
  if (busy.value) {
    return
  }
  busy.value = id
  try {
    await api.archive(id, false)
    await refreshWorkspace(workspaceId)
    toast.add({ title: 'Page restored to active pages', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to restore page', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <WorkspaceFeaturePage
    :workspace-id="workspaceId"
    :workspace="data?.workspace"
    title="Archived pages"
    description="Completed documents stay readable here, separate from active work and Trash."
    icon="i-lucide-archive"
  >
    <UInput
      v-model="search"
      placeholder="Find an archived page…"
      aria-label="Search archived pages"
      icon="i-lucide-search"
      class="w-full sm:max-w-panel-md"
    />
    <DataSkeleton
      v-if="pagesLoading"
      label="Loading archived pages"
    />
    <DataRetry
      v-else-if="pagesError"
      :feedback-keys="[`workspaces:${workspaceId}:pages`]"
      :on-retry="refresh"
    />
    <div
      v-else
      class="divide-y divide-muted border-t border-muted"
    >
      <div
        v-for="page in archived"
        :key="page.id"
        class="flex gap-ui-lg items-center py-ui-lg"
      >
        <span class="text-xl shrink-0">{{ page.icon || '📄' }}</span><NuxtLink
          :to="`/workspaces/${workspaceId}/pages/${page.id}`"
          class="text-sm font-medium truncate flex-1 min-w-ui-zero"
        >{{ page.title }}</NuxtLink>
        <span class="text-xs text-muted hidden sm:block">{{ page.archivedAt ? formatRelativeTime(page.archivedAt) : '' }}</span>
        <UButton
          v-if="canRestore && page.accessLevel === 'edit'"
          label="Restore"
          icon="i-lucide-archive-restore"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="busy === page.id"
          :disabled="!!busy"
          @click="restore(page.id)"
        />
      </div>
      <p
        v-if="!archived.length"
        class="text-sm text-muted py-ui-5xl text-center"
      >
        {{ search ? 'No archived pages match your search.' : 'No archived pages yet. Archive a page from its actions menu.' }}
      </p>
    </div>
  </WorkspaceFeaturePage>
</template>
