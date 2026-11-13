<script setup lang="ts">
import DataRetry from '~/components/ui/DataRetry.vue'
import { useAuth } from '~/features/auth/composables/useAuth'
import PersonalLibraryOverview from '~/features/library/components/PersonalLibraryOverview.vue'
import LayoutToggle from '~/components/ui/LayoutToggle.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceDirectory } from '~/features/workspaces/composables/useWorkspaceDirectory'
import DirectoryShell from '~/components/shell/DirectoryShell.vue'
import DirectoryHeading from '~/components/shell/DirectoryHeading.vue'
import PageToolbar from '~/components/ui/PageToolbar.vue'
import WorkspaceDirectoryCard from './WorkspaceDirectoryCard.vue'
import { useWorkspaceCreation } from '~/features/workspaces/composables/useWorkspaceCreation'

const { state: auth } = useAuth()
const greeting = computed(() => {
  const firstName = auth.user?.name?.trim().split(/\s+/)[0]
  return firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'
})
const { createWorkspace, creatingWorkspace } = useWorkspaceCreation()
const search = ref('')
const scope = ref<'all' | 'owned' | 'shared'>('all')
const ownedCount = computed(() => data.value.filter(workspace => workspace.role === 'owner').length)
const filters = computed(() => [
  { value: 'all' as const, label: 'All workspaces', shortLabel: 'All', count: data.value.length },
  { value: 'owned' as const, label: 'Owned by you', shortLabel: 'Owned', count: ownedCount.value },
  { value: 'shared' as const, label: 'Shared with you', shortLabel: 'Shared', count: data.value.length - ownedCount.value }
])
const savedLayout = useCookie<string>('workspace-directory-layout', { default: () => 'list', sameSite: 'lax', maxAge: 31536000 })
const view = computed<'list' | 'grid'>({
  get: () => savedLayout.value === 'grid' ? 'grid' : 'list',
  set: (value) => {
    savedLayout.value = value
  }
})
const { data, error, status, refresh: refreshDirectory } = useWorkspaceDirectory()
const loading = computed(() => !data.value.length && (status.value === 'idle' || status.value === 'pending'))
const workspaces = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return data.value.filter(workspace => workspace.name.toLocaleLowerCase().includes(query)
    && (scope.value === 'all' || (scope.value === 'owned' ? workspace.role === 'owner' : workspace.role !== 'owner')))
})
</script>

<template>
  <DirectoryShell label="All workspaces">
    <DirectoryHeading
      :title="greeting"
      description="Pick up where you left off, or start something new."
    >
      <template #actions>
        <UButton
          label="New workspace"
          icon="i-lucide-plus"
          :loading="creatingWorkspace"
          class="min-h-ui-4xl px-ui-md"
          @click="createWorkspace"
        />
      </template>
    </DirectoryHeading>
    <DataRetry
      v-if="error"
      :feedback-keys="['workspaces:directory']"
      :on-retry="() => refreshDirectory()"
    />
    <div class="directory-body">
      <section
        aria-label="Your workspaces"
        class="directory-collection"
      >
        <header class="directory-section-heading">
          <h2>Workspaces</h2>
          <LayoutToggle
            v-model="view"
            label="Workspace layout"
          />
        </header>
        <PageToolbar class="directory-toolbar">
          <template #left>
            <div
              role="group"
              aria-label="Filter workspaces"
              class="directory-filters"
            >
              <UButton
                v-for="filter in filters"
                :key="filter.value"
                :aria-pressed="scope === filter.value"
                :aria-label="filter.label"
                color="neutral"
                variant="ghost"
                class="directory-filter"
                :class="{ 'is-selected': scope === filter.value }"
                @click="scope = filter.value"
              >
                <span>{{ filter.shortLabel }}</span><USkeleton
                  v-if="loading"
                  aria-hidden="true"
                  class="h-ui-md w-ui-md"
                /><span
                  v-else
                  class="directory-filter-count"
                >{{ filter.count }}</span>
              </UButton>
            </div>
          </template>
          <template #right>
            <UInput
              v-if="data.length"
              v-model="search"
              icon="i-lucide-search"
              placeholder="Find a workspace…"
              aria-label="Search workspaces"
              size="sm"
              class="directory-search w-ui-13xl"
            />
          </template>
        </PageToolbar>
        <DataSkeleton
          v-if="loading"
          label="Loading workspace directory"
          :kind="view === 'grid' ? 'cards' : 'rows'"
          :rows="4"
          class="mt-ui-xl"
        />
        <div
          v-if="!loading && view === 'list' && workspaces.length"
          class="directory-list-heading"
          aria-hidden="true"
        >
          <span>Workspace</span><span>Access</span><span />
        </div>
        <ul
          v-if="!loading && workspaces.length"
          :class="view === 'grid' ? 'directory-grid' : 'directory-list'"
          :data-layout="view"
        >
          <li
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="min-w-ui-zero"
          >
            <WorkspaceDirectoryCard
              :workspace="workspace"
              :layout="view"
            />
          </li>
        </ul>
        <UEmpty
          v-else-if="!loading && !error && !data.length"
          variant="naked"
          icon="i-lucide-panels-top-left"
          title="Create your first workspace"
          description="Start a project or bring your team together in one shared space."
          class="directory-empty"
          :ui="{ avatar: 'bg-accented/30 text-toned ring-0 rounded-md', title: 'text-xl', description: 'max-w-sm' }"
        >
          <template #actions>
            <UButton
              label="Create workspace"
              icon="i-lucide-plus"
              :loading="creatingWorkspace"
              @click="createWorkspace"
            />
          </template>
        </UEmpty>
        <UEmpty
          v-else-if="!loading && !error"
          variant="naked"
          icon="i-lucide-search"
          :title="search ? 'No matching workspaces' : scope === 'owned' ? 'No workspaces owned by you' : 'No shared workspaces yet'"
          :description="search ? 'Try another name or clear your search.' : 'Workspaces in this category will appear here.'"
          class="py-ui-6xl border-t-0"
          :ui="{ avatar: 'bg-transparent text-muted ring-0' }"
        >
          <template #actions>
            <UButton
              :label="search ? 'Clear search' : 'Show all workspaces'"
              color="neutral"
              variant="outline"
              @click="search = ''; scope = 'all'"
            />
          </template>
        </UEmpty>
      </section>
      <PersonalLibraryOverview
        :workspaces="data"
        :workspaces-loading="loading"
      />
    </div>
  </DirectoryShell>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.directory-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-ui-4xl); }
.directory-collection { min-width: 0; }
.directory-section-heading { display: flex; align-items: center; justify-content: space-between; min-height: var(--spacing-ui-4xl); margin-bottom: var(--spacing-ui-md); }
.directory-section-heading h2 { font-size: var(--text-base); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); color: var(--ui-text-highlighted); }
.directory-toolbar :deep([data-slot=left]) { padding-block: 0; }
.directory-toolbar :deep([data-slot=right]) { padding-block: var(--spacing-ui-xs); }
.directory-filters { display: flex; align-items: center; gap: var(--spacing-ui-xl); }
.directory-filter { font-size: var(--text-xs); padding: var(--spacing-ui-md) 0; gap: var(--spacing-ui-sm); border-radius: 0; border-bottom: var(--app-border-emphasis) solid transparent; margin-bottom: calc(-1 * var(--spacing-ui-zero)); color: var(--ui-text-muted); white-space: nowrap; }
.directory-filter:hover { background: transparent; color: var(--ui-text-highlighted); }
.directory-filter.is-selected { background: transparent; border-bottom-color: var(--ui-text-highlighted); color: var(--ui-text-highlighted); }
.directory-filter-count { display: inline-grid; place-items: center; min-width: var(--spacing-ui-lg); font-size: var(--text-xs); color: var(--ui-text-muted); font-variant-numeric: tabular-nums; }
.directory-filter.is-selected .directory-filter-count { color: var(--ui-text-highlighted); }
.directory-list-heading { display: grid; grid-template-columns: minmax(0, 1fr) var(--spacing-ui-8xl) var(--spacing-ui-3xl); gap: var(--spacing-ui-xl); padding: var(--spacing-ui-lg) var(--spacing-ui-xs) var(--spacing-ui-md); font-size: var(--text-xs); color: var(--ui-text-muted); border-bottom: var(--app-border-thin) solid var(--ui-border-muted); }
.directory-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-ui-lg); padding-top: var(--spacing-ui-xl); }
.directory-list { margin-bottom: calc(-1 * var(--spacing-ui-zero)); }
.directory-empty { padding-block: var(--spacing-ui-8xl); border-top: none; }
@variant sm {
  .directory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@variant lg {
  .directory-body { grid-template-columns: minmax(0, 1fr) var(--container-rail); gap: var(--spacing-ui-4xl); }
  .directory-toolbar { flex-wrap: nowrap; }
  .directory-toolbar :deep([data-slot=left]) { flex-basis: auto; }
}
@variant max-sm {
  .directory-toolbar { flex-wrap: wrap; row-gap: var(--spacing-ui-xs); }
  .directory-toolbar :deep([data-slot=left]) { flex-basis: 100%; overflow-x: auto; }
  .directory-toolbar :deep([data-slot=right]) { width: 100%; justify-content: space-between; padding-bottom: var(--spacing-ui-md); }
  .directory-search { flex: 1; width: auto; }

  .directory-list-heading { grid-template-columns: minmax(0, 1fr) var(--spacing-ui-7xl) var(--spacing-ui-2xl); gap: var(--spacing-ui-xs); padding-inline: 0; }
  .directory-filter { font-size: var(--text-xs); padding-inline: 0; gap: var(--spacing-ui-xs); }
  .directory-filters { gap: var(--spacing-ui-2xs); width: 100%; }
  .directory-filter { flex: 1; justify-content: center; }
}
</style>
