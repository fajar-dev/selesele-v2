<script setup lang="ts">
import EntityIcon from '~/components/ui/EntityIcon.vue'
import type { ContentItem } from '#shared/contracts/item'

const props = defineProps<{
  item: ContentItem
  home: string
  active: boolean
  moving: boolean
  disabled: boolean
  canDelete: boolean
}>()
const emit = defineEmits<{
  dragItem: [
        event: DragEvent,
        item: ContentItem
  ]
  endDrag: [
  ]
  deleteItem: [
        item: ContentItem
  ]
}>()
const actions = computed(() => [{
  label: 'Delete', color: 'error' as const,
  icon: 'i-lucide-trash',
  disabled: props.disabled,
  onSelect: () => emit('deleteItem', props.item)
}])
</script>

<template>
  <div
    class="group/item flex items-center rounded-md hover:bg-(--app-hover)"
    :class="{ 'bg-(--app-selected)': active, 'opacity-50': moving }"
    :aria-busy="moving || undefined"
  >
    <UButton
      :to="`${home}/items/${item.id}`"
      :draggable="!disabled && item.accessLevel === 'edit'"
      color="neutral"
      variant="ghost"
      class="sidebar-link min-w-ui-zero flex-1 overflow-hidden"
      :title="item.title"
      :class="{ 'is-active': active }"
      :ui="{ label: 'truncate' }"
      @dragstart="emit('dragItem', $event, item)"
      @dragend="emit('endDrag')"
    >
      <template #leading>
        <UIcon
          v-if="moving"
          name="i-lucide-loader-circle"
          class="size-ui-lg animate-spin"
        />
        <EntityIcon
          v-else
          :value="item.icon"
          fallback="i-lucide-file"
          class="size-ui-lg text-base"
        />
      </template><span class="min-w-ui-zero flex-1 truncate text-left">{{ item.title }}</span>
    </UButton>
    <UDropdownMenu
      v-if="canDelete"
      :items="actions"
      :content="{ align: 'start' }"
    >
      <UButton
        icon="i-lucide-ellipsis"
        :aria-label="`Actions for item ${item.title}`"
        :disabled="disabled"
        size="xs"
        color="neutral"
        variant="ghost"
        class="mr-ui-xs shrink-0 opacity-50 sm:opacity-0 sm:group-hover/item:opacity-60 sm:group-focus-within/item:opacity-100 focus-visible:opacity-100"
      />
    </UDropdownMenu>
  </div>
</template>
