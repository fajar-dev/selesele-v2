<script setup lang="ts">
import type { DrawingElement } from '#shared/kernel/content'
import { DrawingScene } from '../domain/DrawingScene'

const { element } = defineProps<{
  element: DrawingElement
}>()
const lines = computed(() => element.text.split('\n'))
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
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      v-if="element.type === 'pen'"
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
      <rect
        v-if="element.type === 'sticky'"
        :width="element.width"
        :height="element.height"
        :fill="element.color"
        fill-opacity="0.08"
        :stroke-width="1"
      /><text
        :x="element.type === 'sticky' ? 14 : 0"
        :y="element.type === 'sticky' ? 30 : 26"
        :fill="element.color"
        stroke="none"
        :font-size="element.type === 'sticky' ? 18 : 24"
        font-family="sans-serif"
      >
        <tspan
          v-for="(line, index) in lines"
          :key="index"
          :x="element.type === 'sticky' ? 14 : 0"
          :dy="index ? (element.type === 'sticky' ? 25 : 34) : 0"
        >
          {{ line }}
        </tspan>
      </text>
    </template>
  </g>
</template>
