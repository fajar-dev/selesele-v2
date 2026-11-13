<script setup lang="ts">
import type { ItemTemplate } from '#shared/kernel/library'
import { itemTypeLabels } from '#shared/kernel/content'
import TemplatePreview from './TemplatePreview.vue'

defineProps<{
  template: Omit<ItemTemplate, 'content'>
  writable: boolean
  removable?: boolean
  busy: boolean
  loading: boolean
}>()
const emit = defineEmits<{ use: [], remove: [] }>()
</script>

<template>
  <UCard
    class="template-card shadow-none ring-0"
    :ui="{ body: 'p-ui-zero sm:p-ui-zero flex-1 flex flex-col' }"
  >
    <TemplatePreview :kind="template.kind" />
    <div class="p-ui-xl flex flex-1 flex-col gap-ui-lg">
      <div class="flex items-start justify-between gap-ui-md">
        <span class="text-2xl leading-none">{{ template.icon }}</span>
        <UBadge
          :label="itemTypeLabels[template.kind]"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>
      <div class="space-y-ui-xs flex-1">
        <h3 class="text-sm font-semibold text-highlighted break-words">
          {{ template.title }}
        </h3>
        <p class="text-sm text-muted leading-relaxed line-clamp-2">
          {{ template.description }}
        </p>
      </div>
      <div class="flex items-center justify-between gap-ui-sm pt-ui-sm">
        <UButton
          v-if="writable"
          label="Use template"
          trailing-icon="i-lucide-arrow-up-right"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="loading"
          :disabled="busy"
          @click="emit('use')"
        />
        <span
          v-else
          class="text-xs text-muted"
        >Read-only workspace</span>
        <UButton
          v-if="removable"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          :aria-label="`Delete template ${template.title}`"
          :disabled="busy"
          @click="emit('remove')"
        />
      </div>
    </div>
  </UCard>
</template>
