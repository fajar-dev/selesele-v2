<script setup lang="ts">
import { canvasContentSchema } from '#shared/validation/canvas'

const { content } = defineProps<{
  content: string
}>()
const data = computed(() => {
  try {
    return canvasContentSchema.parse(JSON.parse(content))
  } catch {
    return null
  }
})
const KanbanEditor = defineAsyncComponent(() => import('~/features/kanban/components/KanbanEditor.vue'))
const WhiteboardEditor = defineAsyncComponent(() => import('~/features/whiteboard/components/WhiteboardEditor.vue'))
const DiagramEditor = defineAsyncComponent(() => import('~/features/diagrams/components/DiagramEditor.vue'))
</script>

<template>
  <ClientOnly v-if="data">
    <KanbanEditor
      v-if="data.kind === 'kanban'"
      :content="data"
      :members="[]"
      readonly
    /><WhiteboardEditor
      v-else-if="data.kind === 'whiteboard'"
      :content="data"
      readonly
    /><DiagramEditor
      v-else
      :content="data"
      readonly
    />
  </ClientOnly>
  <pre
    v-else
    class="text-xs whitespace-pre-wrap break-words text-muted"
  >{{ content }}</pre>
</template>
