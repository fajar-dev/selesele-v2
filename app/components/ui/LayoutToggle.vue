<script setup lang="ts">
const model = defineModel<'list' | 'grid'>({ required: true })
defineProps<{ label: string }>()
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="flex shrink-0 items-center gap-0.5 rounded-[5px] border border-muted bg-muted/70 p-0.5"
  >
    <UTooltip
      v-for="mode in (['list', 'grid'] as const)"
      :key="mode"
      :text="`${mode} view`"
    >
      <UButton
        :icon="mode === 'list' ? 'i-lucide-list' : 'i-lucide-layout-grid'"
        :aria-label="`${mode} view`"
        :aria-pressed="model === mode"
        :variant="model === mode ? 'outline' : 'ghost'"
        color="neutral"
        size="xs"
        @click="model = mode"
      />
    </UTooltip>
  </div>
</template>
