<script setup lang="ts">
import ItemResourcesButton from '~/features/resources/components/ItemResourcesButton.vue'
import EditorToolbar from '~/components/ui/EditorToolbar.vue'
import ItemHistory from '~/features/recovery/components/ItemHistory.vue'

defineProps<{
  prepareResources?: () => Promise<void>
  resourceReadonly?: boolean
  itemId: string
  kind: string
  readonly?: boolean
  commentCount: number
  fullscreen: boolean
  exportLabel: string
  exporting?: boolean
}>()
defineEmits<{ comments: [], fullscreen: [], export: [] }>()
</script>

<template>
  <EditorToolbar label="Item toolbar">
    <slot />
    <template #actions>
      <UTooltip text="Comments">
        <UButton
          :label="commentCount ? `Comments ${commentCount}` : 'Comments'"
          aria-label="Open comments"
          icon="i-lucide-message-square"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="$emit('comments')"
        />
      </UTooltip>
      <ItemHistory
        :item-id="itemId"
        :kind="kind"
        :readonly="readonly"
      />
      <slot name="related" />
      <ItemResourcesButton
        :item-id="itemId"
        :readonly="resourceReadonly"
        :prepare="prepareResources"
      />
      <UTooltip :text="exportLabel">
        <UButton
          :aria-label="exportLabel"
          icon="i-lucide-download"
          size="sm"
          color="neutral"
          variant="ghost"
          :loading="exporting"
          @click="$emit('export')"
        />
      </UTooltip>
      <UTooltip :text="fullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'">
        <UButton
          :icon="fullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
          :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          :aria-pressed="fullscreen"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="$emit('fullscreen')"
        />
      </UTooltip>
      <slot name="more" />
    </template>
  </EditorToolbar>
</template>
