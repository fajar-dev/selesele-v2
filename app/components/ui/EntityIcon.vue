<script setup lang="ts">
defineProps<{ value?: string | null, fallback?: string }>()
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center leading-none"
    aria-hidden="true"
  >
    <span v-if="value">{{ value }}</span>
    <UIcon
      v-else-if="fallback"
      :name="fallback"
      class="size-full"
    />
  </span>
</template>
