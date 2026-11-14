<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import type { WhiteboardContent, DrawingElement } from '#shared/kernel/content'
import { canvasPalette } from '~/features/canvases/presentation/canvasPalette'
import { DrawingScene } from '../domain/DrawingScene'
import DrawingShape from './DrawingShape.vue'

const { content, readonly = false, canComment = false } = defineProps<{
  content: WhiteboardContent
  canComment?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  comment: [id: string, type: 'element', label: string]
  change: [
        content: WhiteboardContent
  ]
}>()
defineExpose({ selectObject: (id: string) => {
  if (!content.elements.some(entry => entry.id === id)) {
    return false
  }
  selectedId.value = id
  tool.value = 'select'
  const element = content.elements.find(entry => entry.id === id)!
  view.value = { x: element.x - 100 / zoom.value, y: element.y - 100 / zoom.value }
  return true
} })
const surface = useTemplateRef<SVGSVGElement>('surface')
const { width, height } = useElementSize(surface)
const tool = ref('pen'), color = ref<string>('#18181b'), size = ref(4), zoom = ref(1), view = ref({ x: 0, y: 0 }), selectedId = ref<string | null>(null)
const draft = shallowRef<DrawingElement | null>(null)
const selected = computed(() => content.elements.find(element => element.id === selectedId.value))
const bounds = computed(() => selected.value ? DrawingScene.bounds(draft.value || selected.value) : null)
const tools = [{ value: 'select', icon: 'i-lucide-mouse-pointer-2', label: 'Select (V)' }, { value: 'hand', icon: 'i-lucide-hand', label: 'Pan (H)' }, { value: 'pen', icon: 'i-lucide-pencil', label: 'Draw (P)' }, { value: 'rectangle', icon: 'i-lucide-square', label: 'Rectangle (R)' }, { value: 'ellipse', icon: 'i-lucide-circle', label: 'Ellipse (O)' }, { value: 'line', icon: 'i-lucide-minus', label: 'Line (L)' }, { value: 'arrow', icon: 'i-lucide-arrow-up-right', label: 'Arrow (A)' }, { value: 'text', icon: 'i-lucide-type', label: 'Text (T)' }, { value: 'sticky', icon: 'i-lucide-sticky-note', label: 'Sticky note (N)' }, { value: 'eraser', icon: 'i-lucide-eraser', label: 'Eraser (E)' }]
let origin: {
  x: number
  y: number
} | null = null, initial: DrawingElement | null = null, panning = false
function point(event: PointerEvent) {
  const box = surface.value!.getBoundingClientRect()
  return { x: view.value.x + (event.clientX - box.left) / zoom.value, y: view.value.y + (event.clientY - box.top) / zoom.value, pressure: event.pressure || 0.5 }
}
function update(value: WhiteboardContent) {
  if (!readonly) {
    emit('change', value)
  }
}
function down(event: PointerEvent) {
  if (event.button !== 0 && event.button !== 1) {
    return
  }
  surface.value?.focus()
  surface.value?.setPointerCapture(event.pointerId)
  origin = point(event)
  panning = tool.value === 'hand' || event.button === 1 || (readonly && tool.value !== 'select')
  if (panning) {
    return
  }
  const id = (event.target as Element).closest('[data-element]')?.getAttribute('data-element')
  if (tool.value === 'select') {
    selectedId.value = id || null
    initial = readonly ? null : content.elements.find(element => element.id === id) || null
    return
  }
  if (tool.value === 'eraser') {
    if (id) {
      update(new DrawingScene(content).remove(id))
    }
    return
  }
  draft.value = new DrawingScene(content).create(tool.value as DrawingElement['type'], origin, color.value, size.value)
}
function move(event: PointerEvent) {
  if (!origin) {
    return
  }
  const current = point(event)
  if (panning) {
    view.value = { x: view.value.x - (current.x - origin.x), y: view.value.y - (current.y - origin.y) }
    return
  }
  if (tool.value === 'select' && initial) {
    draft.value = { ...initial, x: initial.x + current.x - origin.x, y: initial.y + current.y - origin.y }
    return
  }
  if (!draft.value) {
    return
  }
  if (draft.value.type === 'pen') {
    if (draft.value.points.length >= 10000) {
      return
    }
    const next = [current.x - origin.x, current.y - origin.y, current.pressure]
    const previous = draft.value.points.at(-1)!
    if (Math.hypot(next[0]! - previous[0]!, next[1]! - previous[1]!) < 1) {
      return
    }
    draft.value = { ...draft.value, points: [...draft.value.points, next] }
  } else if (!['text', 'sticky'].includes(draft.value.type)) {
    draft.value = { ...draft.value, width: current.x - origin.x, height: current.y - origin.y }
  }
}
function up() {
  if (draft.value && !readonly) {
    const scene = new DrawingScene(content)
    try {
      update(initial ? scene.update(draft.value) : scene.add(draft.value))
      selectedId.value = draft.value.id
    } catch (cause) {
      toast.add({ title: 'Unable to add drawing', description: errorMessage(cause), color: 'error' })
    }
  }
  origin = null
  initial = null
  draft.value = null
  panning = false
}
function cancel() {
  origin = null
  initial = null
  draft.value = null
  panning = false
}
const toast = useToast()
function changeSelected(changes: Partial<DrawingElement>) {
  if (selected.value) {
    update(new DrawingScene(content).update({ ...selected.value, ...changes }))
  }
}
function fit() {
  if (!content.elements.length) {
    view.value = { x: 0, y: 0 }
    zoom.value = 1
    return
  }
  const boxes = content.elements.map(DrawingScene.bounds), x = Math.min(...boxes.map(box => box.x)) - 40, y = Math.min(...boxes.map(box => box.y)) - 40
  const spanX = Math.max(...boxes.map(box => box.x + box.width)) - x + 40, spanY = Math.max(...boxes.map(box => box.y + box.height)) - y + 40
  zoom.value = Math.min(2, Math.max(0.1, Math.min(width.value / spanX, height.value / spanY)))
  view.value = { x, y }
}
function keyboard(event: KeyboardEvent) {
  if ((event.target as Element).closest('input,textarea,[contenteditable]')) {
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    if (selectedId.value && !readonly) {
      update(new DrawingScene(content).remove(selectedId.value))
    }
  }
  const shortcuts: Record<string, string> = { v: 'select', h: 'hand', p: 'pen', r: 'rectangle', o: 'ellipse', l: 'line', a: 'arrow', t: 'text', n: 'sticky', e: 'eraser' }
  if (!event.metaKey && !event.ctrlKey && shortcuts[event.key] && !readonly) {
    tool.value = shortcuts[event.key]!
  }
}
function exportSvg() {
  if (!surface.value) {
    return
  }
  const clone = surface.value.cloneNode(true) as SVGSVGElement
  clone.querySelector('[data-selection]')?.remove()
  const boxes = content.elements.map(DrawingScene.bounds)
  const x = Math.min(0, ...boxes.map(box => box.x)) - 24, y = Math.min(0, ...boxes.map(box => box.y)) - 24
  const w = Math.max(800, ...boxes.map(box => box.x + box.width)) - x + 24, h = Math.max(600, ...boxes.map(box => box.y + box.height)) - y + 24
  clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  downloadBlob(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }), 'whiteboard.svg')
}
</script>

<template>
  <section
    class="space-y-ui-md"
    aria-label="Whiteboard editor"
  >
    <div class="editor-tools">
      <UButton
        v-if="selected && canComment"
        label="Comment"
        icon="i-lucide-message-square"
        color="neutral"
        variant="ghost"
        @click="emit('comment', selected.id, 'element', selected.text || selected.type)"
      />
      <div
        role="toolbar"
        aria-label="Drawing tools"
        class="flex flex-wrap gap-ui-xs"
      >
        <UTooltip
          v-for="entry in tools.filter(entry => !readonly || ['select', 'hand'].includes(entry.value))"
          :key="entry.value"
          :text="entry.label"
        >
          <UButton
            :icon="entry.icon"
            :aria-label="entry.label"
            :aria-pressed="tool === entry.value"
            color="neutral"
            :variant="tool === entry.value ? 'soft' : 'ghost'"
            @click="tool = entry.value"
          />
        </UTooltip>
      </div>
      <template v-if="!readonly">
        <USelect
          v-model="color"
          :items="canvasPalette"
          aria-label="Ink color"
        /><USelect
          v-model="size"
          :items="[{ label: 'Thin', value: 2 }, { label: 'Medium', value: 4 }, { label: 'Bold', value: 8 }]"
          aria-label="Stroke size"
        />
      </template>
      <div class="ms-auto flex items-center gap-ui-xs">
        <UButton
          icon="i-lucide-minus"
          aria-label="Zoom out"
          color="neutral"
          variant="ghost"
          @click="zoom = Math.max(0.1, zoom / 1.2)"
        /><span class="text-xs text-muted tabular-nums">{{ Math.round(zoom * 100) }}%</span><UButton
          icon="i-lucide-plus"
          aria-label="Zoom in"
          color="neutral"
          variant="ghost"
          @click="zoom = Math.min(4, zoom * 1.2)"
        /><UButton
          icon="i-lucide-scan"
          aria-label="Fit drawing"
          color="neutral"
          variant="ghost"
          @click="fit"
        /><UButton
          label="SVG"
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          @click="exportSvg"
        />
      </div>
    </div>
    <div
      v-if="selected && !readonly"
      class="flex flex-wrap items-center gap-ui-sm border-t border-muted pt-ui-md"
    >
      <UTextarea
        v-if="['text', 'sticky'].includes(selected.type)"
        :model-value="selected.text"
        :rows="1"
        :maxrows="5"
        autoresize
        :maxlength="4000"
        aria-label="Selected text"
        class="flex-1"
        @update:model-value="changeSelected({ text: String($event) })"
      />
      <UButton
        label="Apply ink"
        color="neutral"
        variant="ghost"
        @click="changeSelected({ color, size })"
      /><UButton
        label="Duplicate"
        icon="i-lucide-copy"
        color="neutral"
        variant="ghost"
        @click="update(new DrawingScene(content).duplicate(selected!.id))"
      /><UButton
        label="Bring forward"
        icon="i-lucide-bring-to-front"
        color="neutral"
        variant="ghost"
        @click="update(new DrawingScene(content).front(selected!.id))"
      /><UButton
        label="Delete"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        @click="update(new DrawingScene(content).remove(selected!.id))"
      />
    </div>
    <svg
      ref="surface"
      tabindex="0"
      class="w-full h-studio bg-white text-blue-500 border border-muted rounded-sm touch-none outline-none focus-visible:ring-1 focus-visible:ring-accented"
      :viewBox="`${view.x} ${view.y} ${Math.max(width, 1) / zoom} ${Math.max(height, 1) / zoom}`"
      role="application"
      aria-label="Drawing surface. Use the toolbar to draw, select or pan. Delete removes the selected element."
      @pointerdown.prevent="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="cancel"
      @keydown="keyboard"
      @wheel.prevent="zoom = Math.min(4, Math.max(0.1, zoom * ($event.deltaY > 0 ? 0.92 : 1.08)))"
    >
      <DrawingShape
        v-for="element in content.elements.filter(element => element.id !== draft?.id)"
        :key="element.id"
        :element="element"
      /><DrawingShape
        v-if="draft"
        :element="draft"
      />
      <rect
        v-if="bounds && !readonly"
        data-selection
        :x="bounds.x - 6"
        :y="bounds.y - 6"
        :width="bounds.width + 12"
        :height="bounds.height + 12"
        fill="none"
        stroke="currentColor"
        :stroke-width="1 / zoom"
        :stroke-dasharray="`${5 / zoom} ${4 / zoom}`"
        pointer-events="none"
      />
    </svg>
    <p class="text-xs text-muted">
      {{ content.elements.length }} {{ content.elements.length === 1 ? 'element' : 'elements' }} · Select and drag to move · Use Pan to explore · Drawings support touch and pen input
    </p>
  </section>
</template>
