<script setup lang="ts">
import type { CanvasPresence } from '#shared/model/presence'
import ItemResourcesButton from '~/features/resources/components/ItemResourcesButton.vue'
import EditorToolbar from '~/components/ui/EditorToolbar.vue'
import { useElementSize } from '@vueuse/core'
import type { WhiteboardContent, DrawingElement } from '#shared/model/content'
import { canvasPalette } from '~/features/canvases/presentation/canvasPalette'
import { useApi } from '~/core/http/useApi'
import { whiteboardSvg } from '../domain/whiteboardSvg'
import { visibleDrawing } from '../domain/visibleDrawing'
import { exportCanvasPng, embedCanvasImages } from '~/features/canvases/presentation/exportCanvas'
import SelectionArrange from '~/features/canvases/components/SelectionArrange.vue'
import { boundingBox, clampCoordinate } from '~/features/canvases/domain/geometry'
import type { Alignment } from '~/features/canvases/domain/geometry'
import { DrawingScene } from '../domain/DrawingScene'
import DrawingShape from './DrawingShape.vue'

const { content, readonly = false, canComment = false, collaborators = [], itemId, prepareResources } = defineProps<{
  prepareResources?: () => Promise<void>
  itemId?: string
  collaborators?: CanvasPresence[]
  content: WhiteboardContent
  canComment?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  presence: [
        value: {
          cursor: CanvasPresence['cursor']
          selected: string[]
        }
  ]
  comment: [
        id: string,
        type: 'element',
        label: string
  ]
  change: [
        content: WhiteboardContent
  ]
}>()
const textEditor = useTemplateRef<{
  textareaRef: HTMLTextAreaElement
}>('textEditor')
const surface = useTemplateRef<SVGSVGElement>('surface')
const { width, height } = useElementSize(surface)
const tool = ref('select'), color = ref<string>('#18181b'), size = ref(4), fill = ref('none'), grid = ref(true), snap = ref(false)
const zoom = ref(1), view = ref({ x: 0, y: 0 }), selectedIds = ref<string[]>([]), spacePan = ref(false)
const draft = shallowRef<DrawingElement | null>(null), preview = shallowRef<DrawingElement[]>([])
const selectedElements = computed(() => content.elements.filter(element => selectedIds.value.includes(element.id)))
const selected = computed(() => selectedElements.value.length === 1 ? selectedElements.value[0] : undefined)
const editable = computed(() => selectedElements.value.filter(element => !element.locked))
watch(selected, (element) => {
  if (element) {
    color.value = element.color
    size.value = element.size
    fill.value = element.fill || 'none'
  }
})
const bounds = computed(() => selectedElements.value.length ? boundingBox((preview.value.length ? preview.value : selectedElements.value).map(DrawingScene.bounds)) : null)
const visible = computed(() => visibleDrawing(content.elements, { ...view.value, width: width.value / zoom.value, height: height.value / zoom.value }, selectedIds.value))
const imageInput = useTemplateRef<HTMLInputElement>('imageInput'), imageBusy = ref(false)
const api = useApi()
const selectionBox = ref<ReturnType<typeof boundingBox> | null>(null)
const gridId = `drawing-grid-${useId().replaceAll(':', '')}`
const tools = [{ value: 'select', icon: 'i-lucide-mouse-pointer-2', label: 'Select (V)' }, { value: 'hand', icon: 'i-lucide-hand', label: 'Pan (H)' }, { value: 'pen', icon: 'i-lucide-pencil', label: 'Draw (P)' }, { value: 'rectangle', icon: 'i-lucide-square', label: 'Rectangle (R)' }, { value: 'ellipse', icon: 'i-lucide-circle', label: 'Ellipse (O)' }, { value: 'line', icon: 'i-lucide-minus', label: 'Line (L)' }, { value: 'arrow', icon: 'i-lucide-arrow-up-right', label: 'Arrow (A)' }, { value: 'text', icon: 'i-lucide-type', label: 'Text (T)' }, { value: 'sticky', icon: 'i-lucide-sticky-note', label: 'Sticky note (N)' }, { value: 'eraser', icon: 'i-lucide-eraser', label: 'Eraser (E)' }]
let origin: {
  x: number
  y: number
} | null = null, initial: DrawingElement[] = [], resizing = false, panning = false, extendSelection: string[] = [], clipboard: DrawingElement[] = [], pasteOffset = 0
const toast = useToast()
watch(() => content.elements, (elements) => {
  selectedIds.value = selectedIds.value.filter(id => elements.some(element => element.id === id))
})
defineExpose({ selectObject(id: string) {
  const element = content.elements.find(entry => entry.id === id)
  if (!element) {
    return false
  }
  selectedIds.value = [id]
  tool.value = 'select'
  view.value = { x: element.x - 100 / zoom.value, y: element.y - 100 / zoom.value }
  return true
} })
function editText(id: string | null) {
  const element = content.elements.find(element => element.id === id)
  if (!element || readonly || element.locked || !['text', 'sticky'].includes(element.type)) {
    return
  }
  selectedIds.value = [element.id]
  tool.value = 'select'
  void nextTick(() => {
    textEditor.value?.textareaRef.focus()
    textEditor.value?.textareaRef.select()
  })
}
function point(event: PointerEvent) {
  const box = surface.value!.getBoundingClientRect()
  return { x: clampCoordinate(view.value.x + (event.clientX - box.left) / zoom.value), y: clampCoordinate(view.value.y + (event.clientY - box.top) / zoom.value), pressure: event.pressure || 0.5 }
}
function command(action: (scene: DrawingScene) => WhiteboardContent) {
  if (readonly) {
    return
  }
  try {
    emit('change', action(new DrawingScene(content)))
  } catch (cause) {
    toast.add({ title: 'Unable to update whiteboard', description: errorMessage(cause), color: 'error' })
  }
}
function down(event: PointerEvent) {
  if (![0, 1].includes(event.button)) {
    return
  }
  surface.value?.focus()
  surface.value?.setPointerCapture(event.pointerId)
  origin = point(event)
  panning = tool.value === 'hand' || spacePan.value || event.button === 1 || (readonly && tool.value !== 'select')
  if (panning) {
    return
  }
  if ((event.target as Element).hasAttribute('data-resize') && selected.value && !selected.value.locked && !readonly) {
    resizing = true
    initial = [JSON.parse(JSON.stringify(selected.value))]
    return
  }
  const id = (event.target as Element).closest('[data-element]')?.getAttribute('data-element')
  if (tool.value === 'select') {
    if (!id) {
      extendSelection = event.shiftKey ? [...selectedIds.value] : []
      if (!event.shiftKey) {
        selectedIds.value = []
      }
      selectionBox.value = { ...origin, width: 0, height: 0 }
    } else {
      const included = selectedIds.value.includes(id)
      selectedIds.value = event.shiftKey ? included ? selectedIds.value.filter(value => value !== id) : [...selectedIds.value, id] : included ? selectedIds.value : [id]
      initial = readonly ? [] : editable.value.map(element => JSON.parse(JSON.stringify(element)))
    }
    return
  }
  if (readonly) {
    return
  }
  if (tool.value === 'eraser') {
    if (id) {
      command(scene => scene.removeMany([id]))
    }
    return
  }
  draft.value = { ...new DrawingScene(content).create(tool.value as DrawingElement['type'], origin, color.value, size.value), fill: fill.value }
}
function move(event: PointerEvent) {
  emit('presence', { cursor: point(event), selected: selectedIds.value })
  if (!origin) {
    return
  }
  const current = point(event)
  if (panning) {
    view.value = { x: view.value.x - (current.x - origin.x), y: view.value.y - (current.y - origin.y) }
    return
  }
  if (selectionBox.value) {
    const box = { x: Math.min(origin.x, current.x), y: Math.min(origin.y, current.y), width: Math.abs(current.x - origin.x), height: Math.abs(current.y - origin.y) }
    selectionBox.value = box
    selectedIds.value = [...new Set([...extendSelection, ...content.elements.filter((element) => {
      const b = DrawingScene.bounds(element)
      return b.x >= box.x && b.y >= box.y && b.x + b.width <= box.x + box.width && b.y + b.height <= box.y + box.height
    }).map(element => element.id)])]
    return
  }
  const snapValue = (value: number) => snap.value ? Math.round(value / 20) * 20 : value
  if (resizing && initial[0]) {
    const box = DrawingScene.bounds(initial[0])
    preview.value = [DrawingScene.resize(initial[0], Math.min(100000, Math.max(20, snapValue(current.x - box.x))), Math.min(100000, Math.max(20, snapValue(current.y - box.y))))]
    return
  }
  if (tool.value === 'select' && initial.length) {
    const dx = snapValue(current.x - origin.x), dy = snapValue(current.y - origin.y)
    preview.value = initial.map(element => ({ ...element, x: clampCoordinate(element.x + dx), y: clampCoordinate(element.y + dy) }))
    return
  }
  if (!draft.value) {
    return
  }
  if (draft.value.type === 'pen') {
    if (draft.value.points.length >= 10000) {
      return
    }
    const next = [current.x - origin.x, current.y - origin.y, current.pressure], previous = draft.value.points.at(-1)!
    if (Math.hypot(next[0]! - previous[0]!, next[1]! - previous[1]!) < 1) {
      return
    }
    draft.value = { ...draft.value, points: [...draft.value.points, next] }
  } else if (!['text', 'sticky'].includes(draft.value.type)) {
    let w = snapValue(current.x - origin.x), h = snapValue(current.y - origin.y)
    if (event.shiftKey) {
      if (['rectangle', 'ellipse'].includes(draft.value.type)) {
        const edge = Math.max(Math.abs(w), Math.abs(h))
        w = Math.sign(w || 1) * edge
        h = Math.sign(h || 1) * edge
      } else {
        const angle = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * Math.PI / 4, length = Math.hypot(w, h)
        w = Math.cos(angle) * length
        h = Math.sin(angle) * length
      }
    }
    draft.value = { ...draft.value, width: w, height: h }
  }
}
function up() {
  if (preview.value.length) {
    const changes = preview.value
    command(() => ({ ...content, elements: content.elements.map(element => changes.find(entry => entry.id === element.id) || element) }))
  } else if (draft.value) {
    const element = draft.value
    if (['rectangle', 'ellipse', 'line', 'arrow'].includes(element.type) && Math.abs(element.width) + Math.abs(element.height) < 4) {
      element.width = 120
      element.height = element.type === 'line' || element.type === 'arrow' ? 0 : 80
    }
    command(scene => scene.add(element))
    selectedIds.value = [element.id]
    if (['text', 'sticky'].includes(element.type)) {
      void nextTick(() => editText(element.id))
    }
  }
  cancel()
}
function cancel() {
  origin = null
  initial = []
  draft.value = null
  preview.value = []
  selectionBox.value = null
  resizing = false
  panning = false
}
function changeSelected(changes: Partial<DrawingElement>) {
  command(scene => scene.changeMany(selectedIds.value, changes))
}
function insertSelection(elements: DrawingElement[], offset = 24) {
  if (readonly || !elements.length) {
    return
  }
  command((scene) => {
    const next = scene.insert(elements, offset)
    selectedIds.value = next.elements.slice(content.elements.length).map(element => element.id)
    tool.value = 'select'
    return next
  })
}
function align(mode: Alignment) {
  command(scene => scene.align(selectedIds.value, mode))
}
function geometry(axis: 'x' | 'y' | 'width' | 'height', value: string) {
  if (!selected.value || selected.value.locked) {
    return
  }
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return
  }
  const element = selected.value
  if (axis === 'x' || axis === 'y') {
    changeSelected({ [axis]: clampCoordinate(number) })
  } else {
    const box = DrawingScene.bounds(element)
    command(scene => scene.update(DrawingScene.resize(element, axis === 'width' ? Math.min(100000, Math.max(1, number)) : box.width, axis === 'height' ? Math.min(100000, Math.max(1, number)) : box.height)))
  }
}
function fit() {
  const box = boundingBox(content.elements.map(DrawingScene.bounds))
  zoom.value = content.elements.length ? Math.min(2, Math.max(0.1, Math.min(width.value / (box.width + 80), height.value / (box.height + 80)))) : 1
  view.value = { x: box.x - (width.value / zoom.value - box.width) / 2, y: box.y - (height.value / zoom.value - box.height) / 2 }
}
function zoomAt(value: number, clientX?: number, clientY?: number) {
  const rect = surface.value?.getBoundingClientRect(), x = rect && clientX !== undefined ? clientX - rect.left : width.value / 2, y = rect && clientY !== undefined ? clientY - rect.top : height.value / 2
  const next = Math.min(4, Math.max(0.1, value))
  view.value = { x: view.value.x + x / zoom.value - x / next, y: view.value.y + y / zoom.value - y / next }
  zoom.value = next
}
function wheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    zoomAt(zoom.value * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
  } else {
    view.value = { x: view.value.x + event.deltaX / zoom.value, y: view.value.y + event.deltaY / zoom.value }
  }
}
function keyboard(event: KeyboardEvent) {
  if (!(event.target as Element).closest('[data-canvas-surface]')) {
    return
  }
  if ((event.target as Element).closest('input,textarea,[contenteditable="true"]')) {
    return
  }
  const mod = event.metaKey || event.ctrlKey, key = event.key.toLowerCase()
  if (event.code === 'Space') {
    event.preventDefault()
    spacePan.value = true
    return
  }
  if (key === 'escape' && selectedIds.value.length) {
    selectedIds.value = []
    cancel()
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (mod && key === 'a') {
    event.preventDefault()
    selectedIds.value = content.elements.map(element => element.id)
    tool.value = 'select'
    return
  }
  if (mod && key === 'c' && selectedElements.value.length) {
    event.preventDefault()
    clipboard = JSON.parse(JSON.stringify(selectedElements.value))
    pasteOffset = 0
    return
  }
  if (readonly) {
    return
  }
  if (mod && key === 'v' && clipboard.length) {
    event.preventDefault()
    pasteOffset += 24
    insertSelection(clipboard, pasteOffset)
    return
  }
  if (mod && key === 'd') {
    event.preventDefault()
    insertSelection(selectedElements.value)
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    command(scene => scene.removeMany(selectedIds.value))
    return
  }
  const deltas: Record<string, [
    number,
    number
  ]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  const delta = deltas[event.key]
  if (delta && selectedIds.value.length) {
    event.preventDefault()
    command(scene => scene.translate(selectedIds.value, delta[0] * (event.shiftKey ? 10 : 1), delta[1] * (event.shiftKey ? 10 : 1)))
    return
  }
  const shortcuts: Record<string, string> = { v: 'select', h: 'hand', p: 'pen', r: 'rectangle', o: 'ellipse', l: 'line', a: 'arrow', t: 'text', n: 'sticky', e: 'eraser' }
  if (!mod && shortcuts[key]) {
    tool.value = shortcuts[key]!
  }
}
async function uploadImage(file: File, position = { x: view.value.x + width.value / zoom.value / 2, y: view.value.y + height.value / zoom.value / 2 }) {
  if (!itemId || readonly) {
    return
  }
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    toast.add({ title: 'Choose a PNG, JPEG, GIF or WebP image', color: 'error' })
    return
  }
  imageBusy.value = true
  let url: string | undefined
  try {
    await prepareResources?.()
    const attachment = (await api.itemResources.attach(itemId, file)).data
    if (!attachment.mime.startsWith('image/')) {
      throw new Error('Choose a PNG, JPEG, GIF or WebP image')
    }
    url = URL.createObjectURL(file)
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight))
    const element: DrawingElement = { ...new DrawingScene(content).create('image', position, '#18181b', 1), imageId: attachment.id, width: Math.max(1, image.naturalWidth * scale), height: Math.max(1, image.naturalHeight * scale) }
    command(scene => scene.add(element))
    selectedIds.value = [element.id]
    tool.value = 'select'
  } catch (cause) {
    toast.add({ title: 'Unable to add image', description: errorMessage(cause), color: 'error' })
  } finally {
    imageBusy.value = false
    if (url) {
      URL.revokeObjectURL(url)
    }
    if (imageInput.value) {
      imageInput.value.value = ''
    }
  }
}
function dropImage(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  const rect = surface.value?.getBoundingClientRect()
  if (file && rect) {
    void uploadImage(file, { x: view.value.x + (event.clientX - rect.left) / zoom.value, y: view.value.y + (event.clientY - rect.top) / zoom.value })
  }
}
const exporting = ref(false)
async function exportImage(png = false) {
  exporting.value = true
  try {
    if (png) {
      await exportCanvasPng(await embedCanvasImages(whiteboardSvg(content, itemId)), 'whiteboard.png')
    } else {
      downloadBlob(new Blob([await embedCanvasImages(whiteboardSvg(content, itemId))], { type: 'image/svg+xml' }), 'whiteboard.svg')
    }
    toast.add({ title: png ? 'PNG exported' : 'SVG exported', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to export drawing', description: errorMessage(cause), color: 'error' })
  } finally {
    exporting.value = false
  }
}
function template(kind: 'brainstorm' | 'retrospective') {
  const labels = kind === 'brainstorm' ? ['Ideas', 'Questions', 'Next steps'] : ['Went well', 'Improve', 'Actions']
  const elements: DrawingElement[] = []
  const bounds = boundingBox(content.elements.map(DrawingScene.bounds))
  const start = content.elements.length ? { x: bounds.x + bounds.width + 80, y: bounds.y } : { x: view.value.x + 40, y: view.value.y + 40 }
  labels.forEach((text, index) => {
    const x = start.x + index * 260, y = start.y
    elements.push({ ...new DrawingScene(content).create('text', { x, y }, '#18181b', 2), text, fontSize: 24 })
    for (let row = 0; row < 2; row++) {
      elements.push({ ...new DrawingScene(content).create('sticky', { x, y: y + 60 + row * 170 }, ['#2563eb', '#d97706', '#16a34a'][index]!, 2), text: 'Write your note' })
    }
  })
  insertSelection(elements, 0)
  void nextTick(fit)
}
</script>

<template>
  <section
    class="space-y-ui-md canvas-editor"
    aria-label="Whiteboard editor"
    @keydown="keyboard"
    @keyup.space="spacePan = false"
    @focusout="spacePan = false"
  >
    <EditorToolbar label="Whiteboard tools">
      <div
        role="group"
        aria-label="Drawing tools"
        class="editor-toolbar-group"
      >
        <UTooltip
          v-for="entry in tools.filter(entry => !readonly || ['select', 'hand'].includes(entry.value))"
          :key="entry.value"
          :text="entry.label"
        >
          <UButton
            size="sm"
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
        <UButton
          v-if="itemId"
          label="Image"
          icon="i-lucide-image-plus"
          size="sm"
          color="neutral"
          variant="ghost"
          :loading="imageBusy"
          @click="imageInput?.click()"
        />
        <input
          ref="imageInput"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          class="sr-only"
          aria-label="Add whiteboard image"
          @change="event => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) uploadImage(file) }"
        >
        <USelect
          v-model="color"
          size="sm"
          :items="canvasPalette"
          aria-label="Ink color"
          @update:model-value="changeSelected({ color: String($event) })"
        />
        <USelect
          v-model="size"
          size="sm"
          :items="[{ label: 'Fine', value: 1 }, { label: 'Thin', value: 2 }, { label: 'Medium', value: 4 }, { label: 'Bold', value: 8 }, { label: 'Heavy', value: 16 }, { label: 'Marker', value: 32 }]"
          aria-label="Stroke size"
          @update:model-value="changeSelected({ size: Number($event) })"
        />
        <USelect
          v-model="fill"
          size="sm"
          :items="[{ label: 'No fill', value: 'none' }, ...canvasPalette]"
          aria-label="Fill color"
          @update:model-value="changeSelected({ fill: String($event) })"
        />
        <UDropdownMenu :items="[{ label: 'Brainstorm', onSelect: () => template('brainstorm') }, { label: 'Retrospective', onSelect: () => template('retrospective') }]">
          <UButton
            label="Templates"
            icon="i-lucide-layout-template"
            size="sm"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>
      <template #actions>
        <UButton
          size="sm"
          icon="i-lucide-grid-2x2"
          aria-label="Toggle grid"
          :aria-pressed="grid"
          color="neutral"
          :variant="grid ? 'soft' : 'ghost'"
          @click="grid = !grid"
        />
        <UButton
          v-if="!readonly"
          label="Snap"
          icon="i-lucide-magnet"
          size="sm"
          :aria-pressed="snap"
          color="neutral"
          :variant="snap ? 'soft' : 'ghost'"
          @click="snap = !snap"
        />
        <UButton
          size="sm"
          icon="i-lucide-minus"
          aria-label="Zoom out"
          color="neutral"
          variant="ghost"
          @click="zoomAt(zoom / 1.2)"
        />
        <UButton
          :label="`${Math.round(zoom * 100)}%`"
          aria-label="Reset zoom to 100%"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="zoomAt(1)"
        />
        <UButton
          size="sm"
          icon="i-lucide-plus"
          aria-label="Zoom in"
          color="neutral"
          variant="ghost"
          @click="zoomAt(zoom * 1.2)"
        />
        <UButton
          size="sm"
          icon="i-lucide-scan"
          aria-label="Fit drawing"
          label="Fit"
          color="neutral"
          variant="ghost"
          @click="fit"
        />
        <UDropdownMenu :items="[{ label: 'Export SVG', onSelect: () => exportImage() }, { label: 'Export PNG', onSelect: () => exportImage(true) }]">
          <UButton
            label="Image"
            aria-label="Export image"
            icon="i-lucide-download"
            size="sm"
            color="neutral"
            variant="ghost"
            :loading="exporting"
          />
        </UDropdownMenu>
        <UPopover>
          <UButton
            icon="i-lucide-keyboard"
            aria-label="Whiteboard shortcuts"
            size="sm"
            color="neutral"
            variant="ghost"
          />
          <template #content>
            <div class="p-ui-lg space-y-ui-sm text-sm max-w-sidebar-mobile">
              <p class="font-medium">
                Whiteboard shortcuts
              </p><p>V select · H pan · P draw · R rectangle · O ellipse · A arrow · T text · N note</p><p>Drag empty space to select a region. Shift-click adds or removes objects. Hold Shift for a square, circle or 45° line.</p><p>Space + drag to pan · Ctrl/⌘ + wheel to zoom · Scroll to pan</p><p>Ctrl/⌘ A select all · C copy · V paste · D duplicate · Z undo</p><p>Arrow keys move · Shift + arrow moves 10 · Delete removes unlocked objects · Esc clears selection</p>
            </div>
          </template>
        </UPopover>
      </template>
    </EditorToolbar>
    <div
      v-if="selectedElements.length"
      class="editor-context-toolbar"
      role="group"
      aria-label="Selected elements"
    >
      <span class="text-xs text-muted tabular-nums">{{ selectedElements.length }} selected</span>
      <UButton
        v-if="selected && canComment"
        size="sm"
        label="Comment"
        icon="i-lucide-message-square"
        color="neutral"
        variant="ghost"
        @click="emit('comment', selected.id, 'element', selected.text || selected.type)"
      />
      <ItemResourcesButton
        v-if="selected"
        :item-id="itemId"
        :anchor="{ type: 'element', id: selected.id }"
        :readonly="readonly"
        :prepare="prepareResources"
      />
      <template v-if="!readonly">
        <UTextarea
          v-if="selected && ['text', 'sticky'].includes(selected.type)"
          ref="textEditor"
          size="sm"
          :model-value="selected.text"
          :rows="1"
          :maxrows="5"
          autoresize
          :maxlength="4000"
          aria-label="Selected text"
          class="flex-1"
          :disabled="selected.locked"
          @update:model-value="changeSelected({ text: String($event) })"
        />
        <USelect
          v-if="selected && ['text', 'sticky'].includes(selected.type)"
          :model-value="selected.fontSize || (selected.type === 'sticky' ? 18 : 24)"
          :items="[12, 14, 18, 24, 32, 48, 64, 96]"
          aria-label="Font size"
          size="sm"
          :disabled="selected.locked"
          @update:model-value="changeSelected({ fontSize: Number($event) })"
        />
        <USelect
          :model-value="selected?.opacity ?? 1"
          :items="[{ label: '100% opacity', value: 1 }, { label: '75% opacity', value: 0.75 }, { label: '50% opacity', value: 0.5 }, { label: '25% opacity', value: 0.25 }]"
          aria-label="Object opacity"
          size="sm"
          :disabled="!editable.length"
          @update:model-value="changeSelected({ opacity: Number($event) })"
        />
        <UButton
          label="Dashed"
          icon="i-lucide-minus"
          size="sm"
          color="neutral"
          :variant="selectedElements.every(element => element.dashed) ? 'soft' : 'ghost'"
          :disabled="!editable.length"
          @click="changeSelected({ dashed: !selectedElements.every(element => element.dashed) })"
        />
        <UPopover v-if="selected">
          <UButton
            label="Position / size"
            icon="i-lucide-sliders-horizontal"
            size="sm"
            color="neutral"
            variant="ghost"
            :disabled="selected.locked"
          />
          <template #content>
            <div class="p-ui-lg grid grid-cols-2 gap-ui-md">
              <label class="space-y-ui-xs text-xs">X<UInput
                :model-value="selected.x"
                type="number"
                size="sm"
                aria-label="Object X position"
                @change="geometry('x', ($event.target as HTMLInputElement).value)"
              /></label>
              <label class="space-y-ui-xs text-xs">Y<UInput
                :model-value="selected.y"
                type="number"
                size="sm"
                aria-label="Object Y position"
                @change="geometry('y', ($event.target as HTMLInputElement).value)"
              /></label>
              <label class="space-y-ui-xs text-xs">Width<UInput
                :model-value="Math.round(DrawingScene.bounds(selected).width)"
                type="number"
                :min="1"
                size="sm"
                aria-label="Object width"
                @change="geometry('width', ($event.target as HTMLInputElement).value)"
              /></label>
              <label class="space-y-ui-xs text-xs">Height<UInput
                :model-value="Math.round(DrawingScene.bounds(selected).height)"
                type="number"
                :min="1"
                size="sm"
                aria-label="Object height"
                @change="geometry('height', ($event.target as HTMLInputElement).value)"
              /></label>
            </div>
          </template>
        </UPopover>
        <SelectionArrange
          :count="editable.length"
          @align="align"
        />
        <UDropdownMenu :items="[{ label: 'Bring to front', onSelect: () => command(scene => scene.layer(selectedIds, true)) }, { label: 'Send to back', onSelect: () => command(scene => scene.layer(selectedIds, false)) }]">
          <UButton
            label="Layer"
            icon="i-lucide-layers"
            size="sm"
            color="neutral"
            variant="ghost"
            :disabled="!editable.length"
          />
        </UDropdownMenu>
        <UButton
          :label="selectedElements.every(element => element.locked) ? 'Unlock' : 'Lock'"
          :icon="selectedElements.every(element => element.locked) ? 'i-lucide-lock-open' : 'i-lucide-lock'"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="command(scene => scene.changeMany(selectedIds, { locked: !selectedElements.every(element => element.locked) }, true))"
        />
        <UButton
          size="sm"
          label="Duplicate"
          icon="i-lucide-copy"
          color="neutral"
          variant="ghost"
          @click="insertSelection(selectedElements)"
        />
        <UButton
          size="sm"
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          :disabled="!editable.length"
          @click="command(scene => scene.removeMany(selectedIds))"
        />
      </template>
    </div>
    <svg
      ref="surface"
      data-canvas-surface
      tabindex="0"
      class="canvas-surface w-full h-studio bg-white text-blue-500 border border-muted rounded-sm touch-none outline-none focus-visible:ring-1 focus-visible:ring-accented"
      :class="{ 'cursor-grab': tool === 'hand' || spacePan }"
      :viewBox="`${view.x} ${view.y} ${Math.max(width, 1) / zoom} ${Math.max(height, 1) / zoom}`"
      role="application"
      aria-label="Drawing surface. Select objects or drag empty space for multi-selection. Shift-click extends selection."
      @dragover.prevent
      @drop.prevent="dropImage"
      @dblclick="editText(($event.target as Element).closest('[data-element]')?.getAttribute('data-element') || null)"
      @pointerdown.prevent="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="cancel"
      @pointerleave="emit('presence', { cursor: null, selected: selectedIds })"
      @wheel.prevent="wheel"
    >
      <defs data-grid><pattern
        :id="gridId"
        width="20"
        height="20"
        patternUnits="userSpaceOnUse"
      ><circle
        cx="1"
        cy="1"
        r="0.7"
        fill="#d4d4d8"
      /></pattern></defs>
      <rect
        v-if="grid"
        data-grid
        :x="view.x"
        :y="view.y"
        :width="Math.max(width, 1) / zoom"
        :height="Math.max(height, 1) / zoom"
        :fill="`url(#${gridId})`"
        pointer-events="none"
      />
      <DrawingShape
        v-for="element in visible.filter(element => element.id !== draft?.id && !preview.some(entry => entry.id === element.id))"
        :key="element.id"
        :element="element"
        :item-id="itemId"
      />
      <DrawingShape
        v-for="element in preview"
        :key="`preview-${element.id}`"
        :element="element"
        :item-id="itemId"
      />
      <DrawingShape
        v-if="draft"
        :element="draft"
        :item-id="itemId"
      />
      <rect
        v-for="element in selectedElements"
        :key="`selection-${element.id}`"
        data-selection
        :x="DrawingScene.bounds(preview.find(entry => entry.id === element.id) || element).x - 4"
        :y="DrawingScene.bounds(preview.find(entry => entry.id === element.id) || element).y - 4"
        :width="DrawingScene.bounds(preview.find(entry => entry.id === element.id) || element).width + 8"
        :height="DrawingScene.bounds(preview.find(entry => entry.id === element.id) || element).height + 8"
        fill="none"
        :stroke="element.locked ? '#a1a1aa' : '#2563eb'"
        :stroke-width="1 / zoom"
        :stroke-dasharray="`${4 / zoom} ${4 / zoom}`"
        pointer-events="none"
      />
      <rect
        v-if="selected && bounds && !selected.locked && !readonly && tool === 'select'"
        data-selection
        data-resize
        :x="bounds.x + bounds.width - 5 / zoom"
        :y="bounds.y + bounds.height - 5 / zoom"
        :width="10 / zoom"
        :height="10 / zoom"
        fill="#2563eb"
        class="cursor-nwse-resize"
      />
      <g
        v-for="member in collaborators.filter(member => member.cursor)"
        :key="member.sessionId"
        data-selection
        :transform="`translate(${member.cursor!.x} ${member.cursor!.y})`"
        pointer-events="none"
      >
        <path
          d="M 0 0 L 0 16 L 5 11 L 11 11 Z"
          :fill="member.color"
          :transform="`scale(${1 / zoom})`"
        /><text
          :x="14 / zoom"
          :y="16 / zoom"
          :fill="member.color"
          :font-size="12 / zoom"
          font-family="sans-serif"
        >{{ member.name }}</text>
      </g>
      <rect
        v-if="selectionBox"
        data-selection
        :x="selectionBox.x"
        :y="selectionBox.y"
        :width="selectionBox.width"
        :height="selectionBox.height"
        fill="#2563eb"
        fill-opacity="0.08"
        stroke="#2563eb"
        :stroke-width="1 / zoom"
        pointer-events="none"
      />
    </svg>
    <p class="text-xs text-muted">
      {{ content.elements.length }} elements · {{ selectedElements.length }} selected · {{ content.elements.filter(element => element.locked).length }} locked · Shift-click or drag a region to select · Space to pan
    </p>
  </section>
</template>
