<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import type { OnResizeEnd } from '@vue-flow/node-resizer'
import type { DiagramNode } from '#shared/kernel/content'

const { id, data, selected, readonly = false } = defineProps<NodeProps<DiagramNode['data']> & {
  readonly?: boolean
}>()
const emit = defineEmits<{
  resize: [
        id: string,
        params: OnResizeEnd['params']
  ]
}>()
</script>

<template>
  <div
    class="relative diagram-shape h-full w-full flex items-center justify-center text-center bg-default text-highlighted border rounded-sm p-ui-lg"
    :class="[{ 'rounded-full': data.shape === 'ellipse', 'border-transparent': data.shape === 'diamond', 'bg-elevated': data.shape === 'note', 'ring-2 ring-primary/30': selected }]"
    :style="{ borderColor: data.shape === 'diamond' ? 'transparent' : data.color }"
  >
    <svg
      v-if="data.shape === 'diamond'"
      class="absolute inset-ui-zero size-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    ><polygon
      points="50,1 99,50 50,99 1,50"
      fill="var(--ui-bg)"
      :stroke="data.color"
      stroke-width="1"
    /></svg>
    <NodeResizer
      :is-visible="selected && !readonly"
      :min-width="80"
      :min-height="60"
      :max-width="2000"
      :max-height="2000"
      @resize-end="emit('resize', id, $event.params)"
    />
    <Handle
      id="top"
      type="target"
      :position="Position.Top"
      :connectable="!readonly"
    /><Handle
      id="left"
      type="target"
      :position="Position.Left"
      :connectable="!readonly"
    />
    <span class="relative text-sm whitespace-pre-wrap break-words min-w-ui-zero">{{ data.label }}</span>
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      :connectable="!readonly"
    /><Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      :connectable="!readonly"
    />
  </div>
</template>
