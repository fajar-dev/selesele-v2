<script setup lang="ts">
import EntityIcon from './EntityIcon.vue'
import type { BreadcrumbItem } from '@nuxt/ui'

defineProps<{ items: (BreadcrumbItem & { emoji?: string | null })[] }>()
</script>

<template>
  <UBreadcrumb
    :items="items"
    class="min-w-0"
    :ui="{ list: 'gap-1.5 sm:gap-2', link: 'max-w-20 sm:max-w-44 truncate text-xs sm:text-[13px] font-normal', separatorIcon: 'size-3 text-dimmed' }"
  >
    <template #item-leading="{ item }">
      <EntityIcon
        v-if="item.emoji || item.icon"
        :value="item.emoji"
        :fallback="item.icon || 'i-lucide-file'"
        class="size-4 text-base"
      />
    </template>
  </UBreadcrumb>
</template>
