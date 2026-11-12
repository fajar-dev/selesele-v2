<script setup lang="ts">
import EntityIcon from './EntityIcon.vue'
import type { BreadcrumbItem } from '@nuxt/ui'

defineProps<{ items: (BreadcrumbItem & { emoji?: string | null })[] }>()
</script>

<template>
  <UBreadcrumb
    :items="items"
    class="min-w-ui-zero"
    :ui="{ list: 'gap-ui-xs sm:gap-ui-sm', link: 'max-w-ui-9xl sm:max-w-ui-13xl truncate text-xs sm:text-xs font-normal', separatorIcon: 'size-ui-md text-dimmed' }"
  >
    <template #item-leading="{ item }">
      <EntityIcon
        v-if="item.emoji || item.icon"
        :value="item.emoji"
        :fallback="item.icon || 'i-lucide-file'"
        class="size-ui-lg text-base"
      />
    </template>
  </UBreadcrumb>
</template>
