<script setup lang="ts">
withDefaults(defineProps<{ seed?: string, document?: boolean }>(), { seed: '', document: false })
</script>

<template>
  <div :class="['workspace-cover', `cover-${workspaceTone(seed)}`, document ? 'document-cover' : 'h-36']" aria-hidden="true">
    <div class="cover-ring" />
    <div class="cover-dot" />
    <div class="cover-paper cover-paper-back" />
    <div class="cover-paper cover-paper-front">
      <UIcon name="i-lucide-sparkle" class="size-5" style="color: var(--cover-ink)" />
      <span /><span /><span />
    </div>
  </div>
</template>
