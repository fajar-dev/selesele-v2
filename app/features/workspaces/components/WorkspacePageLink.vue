<script setup lang="ts">
import EntityIcon from '~/components/ui/EntityIcon.vue'
import type { PageItem } from '#shared/contracts/page'

const props = defineProps<{ page: PageItem, home: string, active: boolean, moving: boolean, disabled: boolean }>()
const emit = defineEmits<{
  dragPage: [event: DragEvent, page: PageItem]
  endDrag: []
  deletePage: [page: PageItem]
}>()
const actions = computed(() => [{
  label: 'Delete', color: 'error' as const,
  icon: 'i-lucide-trash',
  disabled: props.disabled,
  onSelect: () => emit('deletePage', props.page)
}])
</script>

<template>
  <div
    class="group/page flex items-center rounded-md hover:bg-(--app-hover)"
    :class="{ 'bg-(--app-selected)': active, 'opacity-50': moving }"
    :aria-busy="moving || undefined"
  >
    <UButton
      :to="`${home}/pages/${page.id}`"
      :draggable="!disabled"
      color="neutral"
      variant="ghost"
      class="sidebar-link min-w-ui-zero flex-1 overflow-hidden"
      :title="page.title"
      :class="{ 'is-active': active }"
      :ui="{ label: 'truncate' }"
      @dragstart="emit('dragPage', $event, page)"
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
          :value="page.icon"
          fallback="i-lucide-file"
          class="size-ui-lg text-base"
        />
      </template><span class="min-w-ui-zero flex-1 truncate text-left">{{ page.title }}</span>
    </UButton>
    <UDropdownMenu
      :items="actions"
      :content="{ align: 'start' }"
    >
      <UButton
        icon="i-lucide-ellipsis"
        :aria-label="`Actions for page ${page.title}`"
        :disabled="disabled"
        size="xs"
        color="neutral"
        variant="ghost"
        class="mr-ui-xs shrink-0 opacity-50 sm:opacity-0 sm:group-hover/page:opacity-60 sm:group-focus-within/page:opacity-100 focus-visible:opacity-100"
      />
    </UDropdownMenu>
  </div>
</template>
