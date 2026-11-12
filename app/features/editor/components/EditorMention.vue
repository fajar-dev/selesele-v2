<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="inline-flex items-center gap-1 rounded-md bg-primary/8 px-1.5 py-0.5 align-middle border border-primary/15"
  >
    <UAvatar
      v-if="props.node.attrs.avatar.src"
      :src="props.node.attrs.avatar.src"
      :alt="props.node.attrs.label"
      size="xs"
      class="ring-1 ring-primary/15"
    />
    <span class="text-sm font-medium text-primary">{{ props.node.attrs.label }}</span>
  </NodeViewWrapper>
</template>
