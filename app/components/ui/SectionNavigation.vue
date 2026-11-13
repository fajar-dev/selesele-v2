<script setup lang="ts">
defineProps<{ items: { key: string, label: string, icon: string }[], label: string }>()
const selected = defineModel<string>({ required: true })
</script>

<template>
  <nav
    :aria-label="label"
    class="flex flex-wrap md:flex-col gap-ui-xs"
  >
    <UButton
      v-for="item in items"
      :key="item.key"
      :label="item.label"
      :icon="item.icon"
      color="neutral"
      :variant="selected === item.key ? 'soft' : 'ghost'"
      :aria-current="selected === item.key ? 'page' : undefined"
      class="justify-start"
      @click="selected = item.key"
    />
  </nav>
</template>
