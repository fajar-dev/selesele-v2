<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
  <UBreadcrumb
    :items="items"
    class="min-w-0"
    :ui="{ list: 'gap-1.5 sm:gap-2', link: 'max-w-20 sm:max-w-44 truncate text-xs sm:text-[13px] font-normal', separatorIcon: 'size-3 text-dimmed' }"
  />
</template>
