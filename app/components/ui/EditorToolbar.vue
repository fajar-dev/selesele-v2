<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div
    class="editor-toolbar"
    role="group"
    :aria-label="label"
  >
    <div class="editor-toolbar-main">
      <slot />
    </div>
    <div
      v-if="$slots.actions"
      class="editor-toolbar-actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
