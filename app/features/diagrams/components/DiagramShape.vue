<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import type { OnResizeEnd } from '@vue-flow/node-resizer'
import type { DiagramNode } from '#shared/model/content'

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
    class="relative diagram-shape h-full w-full flex items-center justify-center text-center text-highlighted p-ui-lg"
    :class="{ 'ring-2 ring-primary/30 rounded-sm': selected }"
  >
    <svg
      class="absolute inset-ui-zero size-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g
        :fill="data.fill || (data.shape === 'note' ? 'var(--ui-bg-elevated)' : 'var(--ui-bg)')"
        :stroke="data.color"
        :stroke-dasharray="data.dashed ? '6 4' : undefined"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <ellipse
          v-if="data.shape === 'ellipse'"
          cx="50"
          cy="50"
          rx="49"
          ry="49"
        />
        <polygon
          v-else-if="data.shape === 'diamond'"
          points="50,1 99,50 50,99 1,50"
        />
        <polygon
          v-else-if="data.shape === 'parallelogram'"
          points="15,1 99,1 85,99 1,99"
        />
        <polygon
          v-else-if="data.shape === 'hexagon'"
          points="20,1 80,1 99,50 80,99 20,99 1,50"
        />
        <template v-else-if="data.shape === 'cylinder'"><path d="M 1 15 A 49 14 0 0 1 99 15 L 99 85 A 49 14 0 0 1 1 85 Z" /><ellipse
          cx="50"
          cy="15"
          rx="49"
          ry="14"
        /></template>
        <rect
          v-else
          x="1"
          y="1"
          width="98"
          height="98"
          rx="3"
        />
      </g>
    </svg>
    <UIcon
      v-if="data.locked"
      name="i-lucide-lock"
      class="absolute top-ui-xs right-ui-xs size-ui-md text-muted"
    />
    <NodeResizer
      :is-visible="selected && !readonly && !data.locked"
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
    <span
      class="relative text-sm whitespace-pre-wrap break-words min-w-ui-zero"
      :class="{ 'text-white': !!data.fill }"
      :style="{ fontSize: `${data.fontSize || 14}px` }"
    >{{ data.label }}</span>
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
