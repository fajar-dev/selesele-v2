<script setup lang="ts">
import type { WorkspaceItem } from '#shared/contracts/workspace'
import EntityIcon from '~/components/ui/EntityIcon.vue'

defineProps<{ workspace: WorkspaceItem, layout: 'list' | 'grid' }>()
</script>

<template>
  <NuxtLink
    :to="`/workspaces/${workspace.id}`"
    :aria-label="`Open ${workspace.name}`"
    class="directory-workspace group"
    :class="`directory-workspace--${layout}`"
  >
    <div class="directory-workspace-top">
      <div class="directory-workspace-icon">
        <EntityIcon
          :value="workspace.icon"
          fallback="i-lucide-panels-top-left"
          class="size-ui-2xl text-2xl"
        />
      </div>
    </div>
    <div class="directory-workspace-info">
      <h3>{{ workspace.name }}</h3>
      <p v-if="workspace.description">
        {{ workspace.description }}
      </p>
    </div>
    <div class="directory-workspace-footer">
      <span
        v-if="layout === 'grid'"
        class="directory-workspace-role"
      >{{ workspace.archivedAt ? 'Archived' : workspace.role }}</span>
      <UBadge
        v-if="layout === 'list'"
        color="neutral"
        variant="soft"
        size="sm"
        class="capitalize justify-self-start"
      >{{ workspace.archivedAt ? 'Archived' : workspace.role }}</UBadge>
      <span class="directory-workspace-arrow"><UIcon
        name="i-lucide-arrow-up-right"
        class="size-ui-lg"
      /></span>
    </div>
  </NuxtLink>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.directory-workspace { min-width: 0; color: var(--ui-text); transition: background var(--app-duration-normal), border-color var(--app-duration-normal); }
.directory-workspace:focus-visible { outline: var(--spacing-ui-2xs) solid var(--ui-primary); outline-offset: var(--spacing-ui-2xs); }
.directory-workspace-top { display: flex; align-items: center; }
.directory-workspace-icon { width: var(--spacing-ui-5xl); height: var(--spacing-ui-5xl); display: grid; place-items: center; background: var(--app-sidebar); border-radius: var(--radius-sm); flex-shrink: 0; }
.directory-workspace-info { min-width: 0; }
.directory-workspace-info h3 { color: var(--ui-text-highlighted); font-size: var(--text-sm); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.directory-workspace-info > p { font-size: var(--text-xs); line-height: var(--leading-relaxed); color: var(--ui-text-muted); margin-top: var(--spacing-ui-xs); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.directory-workspace-footer { display: flex; align-items: center; gap: var(--spacing-ui-xl); }
.directory-workspace-role { color: var(--ui-text-muted); font-size: var(--text-xs); text-transform: capitalize; }
.directory-workspace-arrow { display: grid; place-items: center; width: var(--spacing-ui-2xl); height: var(--spacing-ui-2xl); flex-shrink: 0; color: var(--ui-text-muted); }
.directory-workspace:hover .directory-workspace-arrow { color: var(--ui-text-highlighted); }
.directory-workspace--grid { display: grid; grid-template-columns: var(--spacing-ui-5xl) minmax(0, 1fr); align-content: start; align-items: center; column-gap: var(--spacing-ui-md); row-gap: var(--spacing-ui-md); height: 100%; border: var(--app-border-thin) solid var(--ui-border); border-radius: var(--radius-sm); padding: var(--spacing-ui-xl); background: var(--app-sidebar); }
.directory-workspace--grid:hover { border-color: var(--ui-border-accented); background: var(--ui-bg-muted); }
.directory-workspace--grid .directory-workspace-footer { grid-column: 1 / -1; padding-top: 0; gap: var(--spacing-ui-md); }
.directory-workspace--grid .directory-workspace-arrow { margin-left: auto; }
.directory-workspace--list { display: grid; align-items: center; grid-template-columns: var(--spacing-ui-5xl) minmax(0, 1fr) auto; gap: var(--spacing-ui-lg); padding: var(--spacing-ui-lg) var(--spacing-ui-xs); border-bottom: var(--app-border-thin) solid var(--ui-border-muted); }
.directory-workspace--list:hover { background: var(--app-hover); }
.directory-workspace--list .directory-workspace-footer { display: grid; grid-template-columns: var(--spacing-ui-8xl) var(--spacing-ui-3xl); gap: var(--spacing-ui-xl); }
@variant max-sm {
  .directory-workspace--grid { padding: var(--spacing-ui-lg); }
  .directory-workspace--list { gap: var(--spacing-ui-sm); padding-inline: 0; grid-template-columns: var(--spacing-ui-4xl) minmax(0, 1fr) auto; }
  .directory-workspace--list .directory-workspace-icon { width: var(--spacing-ui-4xl); height: var(--spacing-ui-5xl); }
  .directory-workspace--list .directory-workspace-footer { gap: var(--spacing-ui-xs); grid-template-columns: var(--spacing-ui-6xl) var(--spacing-ui-xl); }
  .directory-workspace--list .directory-workspace-info h3 { font-size: var(--text-sm); }
  .directory-workspace--list .directory-workspace-info > p { font-size: var(--text-xs); }
}
@media (prefers-reduced-motion: reduce) {
  .directory-workspace { transition: none; }
}
</style>
