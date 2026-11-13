<script setup lang="ts">
import DataRetry from '~/components/ui/DataRetry.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { usePersonalLibrary } from '../composables/usePersonalLibrary'
import type { WorkspaceItem } from '#shared/contracts/workspace'

const props = withDefaults(defineProps<{ workspaces: WorkspaceItem[], workspacesLoading?: boolean }>(), { workspacesLoading: false })
const { data, status, error, refresh } = usePersonalLibrary()
const view = ref<'recent' | 'favorites'>('recent')
const expanded = ref(false)
const items = computed(() => data.value[view.value])
const visible = computed(() => expanded.value ? items.value : items.value.slice(0, 6))
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const workspaceNames = computed(() => new Map(props.workspaces.map(workspace => [workspace.id, workspace.name])))
const tabs = [{ value: 'recent' as const, label: 'Recent' }, { value: 'favorites' as const, label: 'Favorites' }]
watch(view, () => {
  expanded.value = false
})
</script>

<template>
  <section
    class="personal-overview"
    aria-label="Your pages"
    :aria-busy="loading"
  >
    <header class="personal-heading">
      <h2>Your pages</h2>
      <UIcon
        name="i-lucide-history"
        class="size-ui-lg text-dimmed"
      />
    </header>
    <div
      role="group"
      aria-label="Filter your pages"
      class="personal-tabs"
    >
      <UButton
        v-for="tab in tabs"
        :key="tab.value"
        :label="tab.label"
        :aria-pressed="view === tab.value"
        color="neutral"
        variant="ghost"
        size="xs"
        class="personal-tab"
        :class="{ 'is-selected': view === tab.value }"
        @click="view = tab.value"
      />
    </div>
    <DataSkeleton
      v-if="loading && !items.length"
      label="Loading your pages"
      :rows="3"
      class="pt-ui-lg"
    />
    <DataRetry
      v-else-if="error"
      :feedback-keys="['library:personal']"
      :on-retry="() => refresh()"
    />
    <div v-else-if="visible.length">
      <NuxtLink
        v-for="item in visible"
        :key="item.id"
        :to="libraryPath(item)"
        class="personal-page group"
      >
        <span class="personal-page-icon">{{ item.icon || '📄' }}</span>
        <div class="min-w-ui-zero flex-1">
          <p class="truncate text-xs font-medium text-highlighted">
            {{ item.title }}
          </p>
          <p class="truncate mt-ui-xs text-xs text-muted">
            <span v-if="workspaceNames.has(item.workspaceId)">{{ workspaceNames.get(item.workspaceId) }}</span>
            <USkeleton
              v-else-if="workspacesLoading"
              aria-hidden="true"
              class="h-ui-sm w-ui-9xl my-ui-2xs"
            />
            <span v-else>Workspace</span>
          </p>
        </div>
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-ui-md shrink-0 text-dimmed opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </NuxtLink>
    </div>
    <div
      v-else
      class="personal-empty"
    >
      <UIcon
        :name="view === 'favorites' ? 'i-lucide-star' : 'i-lucide-file-text'"
        class="size-ui-xl text-dimmed mb-ui-md"
      />
      <p class="text-xs font-medium text-toned">
        {{ view === 'favorites' ? 'Keep your best ideas close' : 'Ready when you are' }}
      </p>
      <p class="text-xs text-muted leading-normal mt-ui-xs">
        {{ view === 'favorites' ? 'Star a page to find it here.' : 'Pages you open will appear here for quick access.' }}
      </p>
    </div>
    <UButton
      v-if="items.length > 6"
      :label="expanded ? 'Show less' : `Show ${items.length - 6} more`"
      :trailing-icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      color="neutral"
      variant="ghost"
      size="xs"
      class="mt-ui-md"
      @click="expanded = !expanded"
    />
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.personal-overview { min-width: 0; }
.personal-heading { display: flex; align-items: center; justify-content: space-between; min-height: var(--spacing-ui-4xl); margin-bottom: var(--spacing-ui-md); }
.personal-heading h2 { font-size: var(--text-base); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); color: var(--ui-text-highlighted); }
.personal-tabs { display: flex; gap: var(--spacing-ui-xs); padding-block: var(--spacing-ui-xs); min-height: var(--spacing-ui-5xl); border-bottom: var(--app-border-thin) solid var(--ui-border-muted); }
.personal-tab { padding-inline: var(--spacing-ui-md); color: var(--ui-text-muted); }
.personal-tab.is-selected { color: var(--ui-text-highlighted); background: var(--app-selected); }
.personal-page { min-width: 0; display: flex; align-items: center; gap: var(--spacing-ui-sm); padding: var(--spacing-ui-lg) var(--spacing-ui-xs); border-bottom: var(--app-border-thin) solid var(--ui-border-muted); transition: background var(--app-duration-normal); }
.personal-page:hover { background: var(--app-hover); }
.personal-page:focus-visible { outline: var(--spacing-ui-2xs) solid var(--ui-primary); outline-offset: var(--spacing-ui-2xs); }
.personal-page-icon { width: var(--spacing-ui-3xl); height: var(--spacing-ui-4xl); flex-shrink: 0; display: grid; place-items: center; font-size: var(--text-xl); }
.personal-empty { padding: var(--spacing-ui-3xl) var(--spacing-ui-xs); }
@variant lg { .personal-overview { padding-left: var(--spacing-ui-3xl); border-left: var(--app-border-thin) solid var(--ui-border-muted); } }
</style>
