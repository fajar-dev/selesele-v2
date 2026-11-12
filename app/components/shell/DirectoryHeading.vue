<script setup lang="ts">
defineProps<{ title: string, description: string }>()
</script>

<template>
  <header class="directory-heading">
    <div class="min-w-ui-zero">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div
      v-if="$slots.actions"
      class="shrink-0"
    >
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.directory-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--spacing-ui-xl); margin-bottom: var(--spacing-ui-5xl); }
.directory-heading h1 { font-size: var(--text-3xl); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); line-height: var(--leading-tight); overflow-wrap: anywhere; color: var(--ui-text-highlighted); }
.directory-heading p { font-size: var(--text-xs); color: var(--ui-text-muted); margin-top: var(--spacing-ui-sm); line-height: var(--leading-relaxed); }
@variant max-sm {
  .directory-heading { margin-bottom: var(--spacing-ui-2xl); }
  .directory-heading h1 { font-size: var(--text-2xl); }
  .directory-heading p { font-size: var(--text-xs); }
}
</style>
