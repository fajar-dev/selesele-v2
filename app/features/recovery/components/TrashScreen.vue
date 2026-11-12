<script setup lang="ts">
import DirectoryShell from '~/components/shell/DirectoryShell.vue'
import DirectoryHeading from '~/components/shell/DirectoryHeading.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import { useTrash } from '../composables/useTrash'

const route = useRoute()
const workspaceId = computed(() => typeof route.query.workspace === 'string' ? route.query.workspace : null)
const { error, refresh, scopedItems, filter, search, filtering, visible, loading, busy, deleting, deleteOpen, restore, purge } = useTrash(workspaceId)
const filters = [{ value: 'all', label: 'All items' }, { value: 'page', label: 'Pages' }, { value: 'folder', label: 'Folders' }, { value: 'workspace', label: 'Workspaces' }]
const icons = { page: 'i-lucide-file-text', folder: 'i-lucide-folder', workspace: 'i-lucide-panels-top-left' }
</script>

<template>
  <DirectoryShell label="Trash">
    <NuxtLink
      v-if="workspaceId"
      :to="`/workspaces/${workspaceId}/settings`"
      class="inline-flex items-center gap-ui-xs text-xs text-muted hover:text-toned mb-ui-3xl"
    ><UIcon
      name="i-lucide-arrow-left"
      class="size-ui-md"
    /> Workspace settings</NuxtLink>
    <DirectoryHeading
      title="Trash"
      :description="workspaceId ? 'Restore deleted pages and folders in this workspace.' : 'Find and restore deleted pages, folders, and workspaces.'"
    />
    <section
      aria-label="Deleted items"
      class="trash-collection"
    >
      <h2 class="trash-section-heading">
        Deleted items
      </h2>
      <div class="trash-toolbar">
        <div
          class="trash-filters"
          role="group"
          aria-label="Filter trash"
        >
          <UButton
            v-for="tab in filters.filter(item => !workspaceId || item.value !== 'workspace')"
            :key="tab.value"
            color="neutral"
            variant="ghost"
            :aria-pressed="filter === tab.value"
            :class="{ 'is-selected': filter === tab.value }"
            @click="filter = tab.value"
          >
            {{ tab.label }}<span
              v-if="tab.value === 'all' && !loading"
              class="text-xs text-muted ms-ui-xs"
            >{{ scopedItems.length }}</span>
          </UButton>
        </div><UInput
          v-model="search"
          aria-label="Search trash"
          placeholder="Find a deleted item…"
          icon="i-lucide-search"
          size="sm"
          class="w-full sm:w-ui-14xl"
        />
      </div>
      <DataSkeleton
        v-if="loading"
        label="Loading trash"
        :rows="3"
        class="py-ui-2xl"
      />
      <UAlert
        v-else-if="error"
        title="Unable to load trash"
        :description="errorMessage(error)"
        color="error"
        :actions="[{ label: 'Retry', onClick: () => refresh() }]"
        class="my-ui-2xl"
      />
      <div
        v-else-if="!visible.length"
        class="text-center py-ui-9xl px-ui-2xl"
      >
        <div class="inline-flex items-center justify-center size-ui-6xl mb-ui-xl text-dimmed">
          <UIcon
            :name="search ? 'i-lucide-search-x' : 'i-lucide-trash-2'"
            class="size-ui-4xl"
          />
        </div><h2 class="text-base font-medium tracking-tight text-toned">
          {{ filtering ? 'No matching items' : 'Nothing in trash' }}
        </h2><p class="mt-ui-sm text-xs text-muted leading-relaxed max-w-ui-17xl mx-auto">
          {{ filtering ? 'Try another search or reset the filters.' : 'Deleted items will appear here. You can restore them whenever you need.' }}
        </p><UButton
          v-if="filtering"
          label="Reset filters"
          color="neutral"
          variant="ghost"
          size="sm"
          class="mt-ui-lg"
          @click="search = ''; filter = 'all'"
        />
      </div>
      <template v-else>
        <div
          class="trash-columns text-xs font-medium text-muted border-b border-muted py-ui-md"
          aria-hidden="true"
        >
          <span>Name</span><span class="hidden md:block">Workspace</span><span class="hidden sm:block">Deleted</span><span />
        </div>
        <ul class="divide-y divide-muted">
          <li
            v-for="item in visible"
            :key="`${item.kind}:${item.id}`"
            class="trash-columns trash-row"
          >
            <div class="flex items-center gap-ui-md min-w-ui-zero">
              <span class="size-ui-4xl shrink-0 grid place-items-center text-xl"><span v-if="item.icon">{{ item.icon }}</span><UIcon
                v-else
                :name="icons[item.kind]"
                class="size-ui-xl text-muted"
              /></span><div class="min-w-ui-zero">
                <p class="text-xs font-medium text-highlighted truncate">
                  {{ item.title }}
                </p><p class="text-xs text-muted capitalize mt-ui-xs">
                  {{ item.kind }}<span class="md:hidden"> · {{ item.workspaceName }}</span>
                </p>
              </div>
            </div>
            <span class="hidden md:flex items-center gap-ui-sm min-w-ui-zero text-xs text-muted"><UIcon
              name="i-lucide-panels-top-left"
              class="size-ui-md shrink-0"
            /><span class="truncate">{{ item.workspaceName }}</span></span><time
              :datetime="item.deletedAt"
              :title="new Date(item.deletedAt).toLocaleString()"
              class="hidden sm:block text-xs text-muted"
            >{{ formatRelativeTime(item.deletedAt) }}</time><div class="flex items-center justify-end gap-ui-xs">
              <UButton
                label="Restore"
                icon="i-lucide-rotate-ccw"
                size="xs"
                color="neutral"
                variant="outline"
                :loading="busy === item.id"
                :disabled="!!busy"
                @click="restore(item)"
              /><UTooltip
                v-if="item.canPurge"
                text="Delete permanently"
              >
                <UButton
                  icon="i-lucide-trash"
                  aria-label="Delete permanently"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :disabled="!!busy"
                  @click="deleting = item; deleteOpen = true"
                />
              </UTooltip>
            </div>
          </li>
        </ul>
      </template>
    </section>
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete permanently?"
      :description="`“${deleting?.title || 'This item'}” and its contents will be removed permanently. This cannot be undone.`"
      confirm-label="Delete permanently"
      :on-confirm="purge"
    />
  </DirectoryShell>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.trash-collection { min-width: 0; }
.trash-section-heading { display: flex; align-items: center; min-height: var(--spacing-ui-4xl); margin-bottom: var(--spacing-ui-md); font-size: var(--text-base); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); color: var(--ui-text-highlighted); }
.trash-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-ui-xl); min-height: var(--spacing-ui-5xl); border-bottom: var(--app-border-thin) solid var(--ui-border-muted); }
.trash-filters { display: flex; align-items: stretch; gap: var(--spacing-ui-xl); }
.trash-filters button { padding: var(--spacing-ui-md) 0; border-radius: 0; border-bottom: var(--app-border-emphasis) solid transparent; margin-bottom: calc(-1 * var(--spacing-ui-zero)); color: var(--ui-text-muted); font-size: var(--text-xs); white-space: nowrap; }
.trash-filters button:hover { background: transparent; color: var(--ui-text-highlighted); }
.trash-filters button.is-selected { background: transparent; border-color: var(--ui-text-highlighted); color: var(--ui-text-highlighted); font-weight: var(--font-weight-medium); }
.trash-columns { display: grid; grid-template-columns: minmax(0, 1fr) var(--spacing-ui-13xl) var(--spacing-ui-10xl) var(--spacing-ui-12xl); gap: var(--spacing-ui-lg); align-items: center; padding-inline: var(--spacing-ui-sm); }
.trash-row { padding-block: var(--spacing-ui-xl); }
.trash-row:hover { background: var(--app-hover); }
@variant max-md {
  .trash-toolbar { flex-wrap: wrap; gap: var(--spacing-ui-md); padding-bottom: var(--spacing-ui-md); }
  .trash-filters { width: 100%; justify-content: space-between; gap: var(--spacing-ui-md); }
  .trash-filters button { font-size: var(--text-xs); padding-block: var(--spacing-ui-md); }
  .trash-columns { grid-template-columns: minmax(0, 1fr) var(--spacing-ui-9xl) var(--spacing-ui-11xl); gap: var(--spacing-ui-sm); padding-inline: 0; }
}
@variant max-sm {
  .trash-columns { grid-template-columns: minmax(0, 1fr) var(--spacing-ui-11xl); }
}
</style>
