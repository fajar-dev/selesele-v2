<script setup lang="ts">
import AppHeader from '~/components/shell/AppHeader.vue'
import ScreenContent from '~/components/ui/ScreenContent.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'

const api = useApi().library
const query = useLazyAsyncData('library:my-tasks', async () => (await api.myTasks()).data, { server: false, default: () => [] })
const scope = ref('all'), workspace = ref('__all'), search = ref('')
const today = ref('')
function updateToday() {
  const now = new Date()
  today.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  updateToday()
  timer = setInterval(updateToday, 60000)
})
onScopeDispose(() => clearInterval(timer))
const workspaces = computed(() => [{ label: 'All workspaces', value: '__all' }, ...[...new Map(query.data.value.map(task => [task.workspaceId, { label: task.workspaceName, value: task.workspaceId }])).values()]])
const tasks = computed(() => query.data.value.filter(task =>
  (workspace.value === '__all' || task.workspaceId === workspace.value)
  && `${task.title} ${task.itemTitle} ${task.workspaceName}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())
  && (scope.value === 'all' || (scope.value === 'today' && task.dueDate === today.value) || (scope.value === 'overdue' && !!task.dueDate && task.dueDate < today.value) || (scope.value === 'unscheduled' && !task.dueDate))
).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.title.localeCompare(b.title)))
useFeedbackToast(query.error, { key: 'library:my-tasks', title: 'Unable to load your tasks', retry: () => query.refresh() })
</script>

<template>
  <div class="app-enter pb-ui-7xl">
    <AppHeader />
    <ScreenContent>
      <ScreenHeading
        title="My tasks"
        description="Tasks assigned to you across your accessible workspaces."
      >
        <template #icon>
          <UIcon
            name="i-lucide-list-checks"
            class="size-ui-3xl"
          />
        </template>
        <template #actions>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="query.status.value === 'pending'"
            @click="query.refresh()"
          />
        </template>
      </ScreenHeading>
      <div class="flex flex-wrap gap-ui-md items-center">
        <USelect
          v-model="scope"
          :items="[{ label: 'All assigned', value: 'all' }, { label: 'Due today', value: 'today' }, { label: 'Overdue', value: 'overdue' }, { label: 'No due date', value: 'unscheduled' }]"
          aria-label="Filter due date"
        />
        <USelect
          v-model="workspace"
          :items="workspaces"
          aria-label="Filter workspace"
        />
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search your tasks…"
          aria-label="Search your tasks"
        />
      </div>
      <DataSkeleton
        v-if="query.status.value === 'pending' && !query.data.value.length"
        label="Loading your tasks"
      />
      <DataRetry
        v-else-if="query.error.value"
        :on-retry="() => query.refresh()"
      />
      <div
        v-else-if="tasks.length"
        class="space-y-ui-xs"
      >
        <NuxtLink
          v-for="task in tasks"
          :key="`${task.itemId}:${task.id}`"
          :to="{ path: `/workspaces/${task.workspaceId}/items/${task.itemId}`, query: { task: task.id } }"
          class="flex items-center gap-ui-lg p-ui-lg rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <UIcon
            name="i-lucide-square-check"
            class="size-ui-xl text-muted shrink-0"
          />
          <div class="min-w-ui-zero flex-1 space-y-ui-xs">
            <p class="text-sm font-medium text-highlighted truncate">{{ task.title }}</p>
            <p class="text-xs text-muted truncate">{{ task.workspaceName }} · {{ task.itemTitle }} · {{ task.columnTitle }}</p>
          </div>
          <UBadge
            :label="task.priority"
            color="neutral"
            variant="soft"
            class="capitalize"
          />
          <span
            v-if="task.dueDate"
            class="text-xs shrink-0"
            :class="task.dueDate < today ? 'text-error' : 'text-muted'"
          >{{ task.dueDate }}</span>
        </NuxtLink>
      </div>
      <UEmpty
        v-else
        icon="i-lucide-list-checks"
        title="No matching tasks"
        description="Tasks assigned to you on active boards will appear here."
        variant="naked"
      />
    </ScreenContent>
  </div>
</template>
