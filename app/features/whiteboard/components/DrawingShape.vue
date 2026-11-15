<script setup lang="ts">
import type { DrawingElement } from '#shared/model/content'
import { drawingTextLines } from '../domain/drawingText'
import { DrawingScene } from '../domain/DrawingScene'

const { element, itemId } = defineProps<{
  itemId?: string
  element: DrawingElement
}>()
const font = computed(() => element.fontSize || (element.type === 'sticky' ? 18 : 24))
const clipId = `note-text-${useId().replaceAll(':', '')}`
const lines = computed(() => drawingTextLines(element))
const head = computed(() => {
  const angle = Math.atan2(element.height, element.width), size = 14 + element.size
  return `${element.width - size * Math.cos(angle - Math.PI / 6)},${element.height - size * Math.sin(angle - Math.PI / 6)} ${element.width},${element.height} ${element.width - size * Math.cos(angle + Math.PI / 6)},${element.height - size * Math.sin(angle + Math.PI / 6)}`
})
</script>

<template>
  <g
    :transform="`translate(${element.x},${element.y})`"
    :data-element="element.id"
    :stroke="element.color"
    :stroke-width="element.size"
    :fill="element.fill || 'none'"
    :opacity="element.opacity ?? 1"
    :stroke-dasharray="element.dashed ? `${element.size * 3} ${element.size * 2}` : undefined"
    pointer-events="all"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <image
      v-if="element.type === 'image' && element.imageId && itemId"
      :href="`/api/items/${itemId}/attachments/${element.imageId}/content`"
      :width="Math.abs(element.width)"
      :height="Math.abs(element.height)"
      preserveAspectRatio="xMidYMid meet"
    />
    <path
      v-else-if="element.type === 'pen'"
      :d="DrawingScene.path(element)"
      :fill="element.color"
      stroke="none"
    />
    <rect
      v-else-if="element.type === 'rectangle'"
      :x="Math.min(0, element.width)"
      :y="Math.min(0, element.height)"
      :width="Math.abs(element.width)"
      :height="Math.abs(element.height)"
    />
    <ellipse
      v-else-if="element.type === 'ellipse'"
      :cx="element.width / 2"
      :cy="element.height / 2"
      :rx="Math.abs(element.width / 2)"
      :ry="Math.abs(element.height / 2)"
    />
    <template v-else-if="element.type === 'line' || element.type === 'arrow'">
      <line
        :x2="element.width"
        :y2="element.height"
      /><polyline
        v-if="element.type === 'arrow'"
        :points="head"
      />
    </template>
    <template v-else>
      <defs v-if="element.type === 'sticky'">
        <clipPath :id="clipId">
          <rect
            x="10"
            y="8"
            :width="Math.max(1, element.width - 20)"
            :height="Math.max(1, element.height - 16)"
          />
        </clipPath>
      </defs>
      <rect
        v-if="element.type === 'sticky'"
        :width="element.width"
        :height="element.height"
        :fill="element.fill && element.fill !== 'none' ? element.fill : element.color"
        :fill-opacity="element.fill && element.fill !== 'none' ? 1 : 0.08"
        :stroke-width="1"
      /><text
        :x="element.type === 'sticky' ? 14 : 0"
        :y="element.type === 'sticky' ? font + 12 : font"
        :fill="element.type === 'sticky' && element.fill && element.fill !== 'none' ? '#ffffff' : element.color"
        :clip-path="element.type === 'sticky' ? `url(#${clipId})` : undefined"
        stroke="none"
        :font-size="font"
        font-family="sans-serif"
      >
        <tspan
          v-for="(line, index) in lines"
          :key="index"
          :x="element.type === 'sticky' ? 14 : 0"
          :dy="index ? font * 1.4 : 0"
        >
          {{ line }}
        </tspan>
      </text>
    </template>
  </g>
</template>
