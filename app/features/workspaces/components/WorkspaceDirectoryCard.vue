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
          class="size-6 text-2xl"
        />
      </div>
      <UBadge
        v-if="layout === 'grid'"
        color="neutral"
        variant="soft"
        size="sm"
        class="capitalize justify-self-start"
      >{{ workspace.role }}</UBadge>
    </div>
    <div class="directory-workspace-info">
      <h3>{{ workspace.name }}</h3>
      <p>{{ workspace.description || 'Notes and projects for your team.' }}</p>
    </div>
    <div class="directory-workspace-footer">
      <p class="directory-workspace-date"><UIcon
        v-if="layout === 'grid'"
        name="i-lucide-calendar-days"
        class="size-3.5"
      /> Created {{ formatCalendarDate(workspace.createdAt) }}</p>
      <UBadge
        v-if="layout === 'list'"
        color="neutral"
        variant="soft"
        size="sm"
        class="capitalize justify-self-start"
      >{{ workspace.role }}</UBadge>
      <span class="directory-workspace-arrow"><UIcon
        name="i-lucide-arrow-up-right"
        class="size-4"
      /></span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.directory-workspace { min-width: 0; color: var(--ui-text); transition: background 180ms, border-color 180ms, box-shadow 180ms, transform 180ms; }
.directory-workspace:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 3px; }
.directory-workspace-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.directory-workspace-icon { width: 45px; height: 47px; display: grid; place-items: center; border: 1px solid var(--ui-border-muted); background: var(--ui-bg-muted); border-radius: 5px; flex-shrink: 0; }
.directory-workspace-info { min-width: 0; }
.directory-workspace-info h3 { color: var(--ui-text-highlighted); font-size: 16px; font-weight: 550; letter-spacing: -0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.directory-workspace-info > p { font-size: 12px; line-height: 1.7; color: var(--ui-text-muted); margin-top: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.directory-workspace-footer { display: flex; align-items: center; gap: 24px; }
.directory-workspace-date { display: inline-flex; align-items: center; gap: 6px; color: var(--ui-text-muted); font-size: 10px; white-space: nowrap; }
.directory-workspace-arrow { display: inline-grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; color: var(--ui-text-muted); transition: color 180ms, background 180ms; }
.directory-workspace:hover .directory-workspace-arrow { background: var(--ui-bg-accented); color: var(--ui-text-highlighted); }
.directory-workspace--list { display: grid; align-items: center; grid-template-columns: 45px minmax(0, 1fr) auto; gap: 20px; padding: 20px 6px; border-bottom: 1px solid var(--ui-border-muted); }
.directory-workspace--list:hover { background: var(--app-hover); }
.directory-workspace--grid { display: flex; flex-direction: column; height: 100%; min-height: 205px; border: 1px solid var(--ui-border); border-radius: 6px; padding: 20px; background: var(--ui-bg); }
.directory-workspace--grid:hover { border-color: var(--ui-border-accented); box-shadow: 0 5px 18px #00000006; transform: translateY(-2px); }
.directory-workspace--grid .directory-workspace-info { margin-top: 17px; flex: 1; }
.directory-workspace--grid h3 { font-size: 17px; }
.directory-workspace--grid .directory-workspace-footer { justify-content: space-between; margin-top: 22px; gap: 10px; }
.directory-workspace--list .directory-workspace-footer { display: grid; grid-template-columns: 140px 76px 30px; gap: 20px; }
.directory-workspace--grid .directory-workspace-icon { border: none; background: var(--ui-bg-muted); width: 45px; height: 45px; }
@media (max-width: 1023px) {
  .directory-workspace--list .directory-workspace-footer { grid-template-columns: 65px 30px; }
  .directory-workspace--list .directory-workspace-date { display: none; }
}
@media (max-width: 639px) {
  .directory-workspace--list { gap: 12px; padding-inline: 0; grid-template-columns: 40px minmax(0, 1fr) auto; }
  .directory-workspace--list .directory-workspace-icon { width: 40px; height: 43px; }
  .directory-workspace--list .directory-workspace-footer { gap: 5px; grid-template-columns: 55px 25px; }
  .directory-workspace--list .directory-workspace-info h3 { font-size: 14px; }
  .directory-workspace--list .directory-workspace-info > p { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .directory-workspace { transition: none; }
  .directory-workspace--grid:hover { transform: none; }
}
</style>
