<script setup lang="ts">
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'

defineProps<{ content: string }>()
const extensions = [TaskList, TaskItem, TableKit]
</script>

<template>
  <UEditor
    v-if="content"
    :model-value="content"
    content-type="markdown"
    :editable="false"
    :extensions="extensions"
    :mention="false"
    :ui="{ base: 'px-ui-zero py-ui-zero text-sm leading-relaxed focus:outline-none', content: 'max-w-none break-words' }"
  />
  <p
    v-else
    class="text-sm text-muted italic"
  >
    This version has no content.
  </p>
</template>
