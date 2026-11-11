<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 align-middle border border-gray-200 dark:border-gray-700"
  >
    <UAvatar
      v-if="props.node.attrs.avatar.src"
      :src="props.node.attrs.avatar.src"
      :alt="props.node.attrs.label"
      size="xs"
      class="ring-1 ring-gray-200 dark:ring-gray-700"
    />
    <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ props.node.attrs.label }}</span>
  </NodeViewWrapper>
</template>
