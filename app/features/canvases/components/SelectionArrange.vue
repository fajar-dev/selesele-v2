<script setup lang="ts">
import type { Alignment } from '../domain/geometry'

const { count } = defineProps<{ count: number }>()
const emit = defineEmits<{ align: [mode: Alignment] }>()
const items = computed(() => [
  ...([{ label: 'Align left', value: 'left' }, { label: 'Align center', value: 'center' }, { label: 'Align right', value: 'right' }, { label: 'Align top', value: 'top' }, { label: 'Align middle', value: 'middle' }, { label: 'Align bottom', value: 'bottom' }] as const).map(entry => ({ label: entry.label, disabled: count < 2, onSelect: () => emit('align', entry.value) })),
  ...([{ label: 'Distribute horizontally', value: 'horizontal' }, { label: 'Distribute vertically', value: 'vertical' }] as const).map(entry => ({ label: entry.label, disabled: count < 3, onSelect: () => emit('align', entry.value) }))
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      label="Align"
      icon="i-lucide-align-start-vertical"
      size="sm"
      color="neutral"
      variant="ghost"
      :disabled="count < 2"
    />
  </UDropdownMenu>
</template>
