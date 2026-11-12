<script setup lang="ts">
import AppHeader from './AppHeader.vue'

defineProps<{ label?: string }>()
</script>

<template>
  <div class="directory-shell-screen">
    <AppHeader />
    <main
      :aria-label="label"
      class="directory-shell-content app-enter"
    >
      <slot />
    </main>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.directory-shell-screen { min-height: var(--spacing-viewport); background: var(--ui-bg); }
.directory-shell-content { width: 100%; max-width: var(--container-directory); margin-inline: auto; padding: var(--spacing-ui-5xl) var(--spacing-ui-xl) var(--spacing-ui-6xl); }
@variant sm { .directory-shell-content { padding: var(--spacing-ui-5xl) var(--spacing-ui-5xl) var(--spacing-ui-6xl); } }
</style>
