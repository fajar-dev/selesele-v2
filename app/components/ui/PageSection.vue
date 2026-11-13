<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section
    :aria-label="title"
    class="space-y-ui-xl"
  >
    <div class="flex items-start justify-between gap-ui-lg border-b border-muted pb-ui-lg">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-ui-xs text-sm text-muted leading-relaxed"
        >
          {{ description }}
        </p>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>
