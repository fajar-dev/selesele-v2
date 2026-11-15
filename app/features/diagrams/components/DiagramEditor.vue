<script setup lang="ts">
import type { CanvasPresence } from '#shared/model/presence'
import ItemResourcesButton from '~/features/resources/components/ItemResourcesButton.vue'
import EditorToolbar from '~/components/ui/EditorToolbar.vue'
import { VueFlow, useVueFlow, MarkerType, SelectionMode } from '@vue-flow/core'
import type { Node, Edge, Connection } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { ResizeParams } from '@vue-flow/node-resizer'
import type { DiagramContent, DiagramNode, DiagramEdge } from '#shared/model/content'
import { canvasPalette } from '~/features/canvases/presentation/canvasPalette'
import { exportCanvasPng } from '~/features/canvases/presentation/exportCanvas'
import SelectionArrange from '~/features/canvases/components/SelectionArrange.vue'
import type { Alignment } from '~/features/canvases/domain/geometry'
import { clampCoordinate } from '~/features/canvases/domain/geometry'
import { DiagramGraph } from '../domain/DiagramGraph'
import { diagramTemplate } from '../domain/diagramTemplates'
import DiagramShape from './DiagramShape.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'

const { content, readonly = false, canComment = false, collaborators = [], itemId, prepareResources } = defineProps<{ prepareResources?: () => Promise<void>, itemId?: string, collaborators?: CanvasPresence[], content: DiagramContent, canComment?: boolean, readonly?: boolean }>()
const emit = defineEmits<{ presence: [value: { cursor: CanvasPresence['cursor'], selected: string[] }], comment: [id: string, type: 'node' | 'edge', label: string], change: [content: DiagramContent] }>()
const flowId = useId()
const { screenToFlowCoordinate, fitView, getSelectedNodes, getSelectedEdges, viewport, zoomTo } = useVueFlow(flowId)
const nodes = shallowRef<Node<DiagramNode['data']>[]>([]), edges = shallowRef<Edge[]>([])
const selectedIds = ref<string[]>([]), selectedEdgeIds = ref<string[]>([]), minimap = ref(false), snap = ref(true), grid = ref(true), pan = ref(false), search = ref(''), exporting = ref(false)
const selectedNodes = computed(() => content.nodes.filter(node => selectedIds.value.includes(node.id)))
const editable = computed(() => selectedNodes.value.filter(node => !node.data.locked))
const node = computed(() => selectedNodes.value.length === 1 ? selectedNodes.value[0] : undefined)
const edge = computed(() => selectedEdgeIds.value.length === 1 && !selectedIds.value.length ? content.edges.find(edge => edge.id === selectedEdgeIds.value[0]) : undefined)
const appearance = computed(() => {
  const data = selectedNodes.value.map(node => node.data)
  function uniform<T>(values: T[], mixed: T): T {
    return values.length && values.every(value => value === values[0]) ? values[0]! : mixed
  }
  return {
    color: uniform(data.map(data => data.color), '__mixed'),
    fill: uniform(data.map(data => data.fill || '__none'), '__mixed'),
    fontSize: uniform(data.map(data => data.fontSize || 14), 0)
  }
})
const matches = computed(() => search.value.trim() ? content.nodes.filter(node => node.data.label.toLowerCase().includes(search.value.trim().toLowerCase())) : [])
watch(() => getSelectedNodes.value.map(node => node.id), (ids) => {
  selectedIds.value = ids
})
watch(() => getSelectedEdges.value.map(edge => edge.id), (ids) => {
  selectedEdgeIds.value = ids
})
const textEditor = useTemplateRef<{ textareaRef: HTMLTextAreaElement }>('textEditor')
const surface = useTemplateRef<HTMLDivElement>('surface')
watch([() => content, () => readonly], () => {
  selectedIds.value = selectedIds.value.filter(id => content.nodes.some(node => node.id === id))
  selectedEdgeIds.value = selectedEdgeIds.value.filter(id => content.edges.some(edge => edge.id === id))
  nodes.value = content.nodes.map(node => ({ ...JSON.parse(JSON.stringify(node)), selected: selectedIds.value.includes(node.id), draggable: !readonly && !node.data.locked, deletable: !readonly && !node.data.locked, style: { width: `${node.data.width}px`, height: `${node.data.height}px` } }))
  edges.value = content.edges.map(edge => ({ ...edge, selected: selectedEdgeIds.value.includes(edge.id), markerEnd: edge.arrow !== 'none' ? { type: MarkerType.ArrowClosed, color: edge.color || '#71717a' } : undefined, markerStart: edge.arrow === 'both' ? { type: MarkerType.ArrowClosed, color: edge.color || '#71717a' } : undefined, style: { stroke: edge.color || '#71717a', strokeDasharray: edge.dashed ? '6 4' : undefined }, updatable: !readonly }))
}, { immediate: true })
function select(ids: string[], edgeIds: string[] = []) {
  selectedIds.value = ids
  selectedEdgeIds.value = edgeIds
  nodes.value = nodes.value.map(node => ({ ...node, selected: ids.includes(node.id) }))
  edges.value = edges.value.map(edge => ({ ...edge, selected: edgeIds.includes(edge.id) }))
}
defineExpose({ selectObject(id: string) {
  const targetNode = content.nodes.find(entry => entry.id === id), targetEdge = content.edges.find(entry => entry.id === id)
  if (!targetNode && !targetEdge) {
    return false
  }
  select(targetNode ? [id] : [], targetEdge ? [id] : [])
  void nextTick(() => fitView({ nodes: targetNode ? [id] : [targetEdge!.source, targetEdge!.target], padding: 0.5 }))
  return true
} })
function editText(id: string) {
  const entry = content.nodes.find(node => node.id === id)
  if (!entry || readonly || entry.data.locked) {
    return
  }
  select([id])
  void nextTick(() => {
    textEditor.value?.textareaRef.focus()
    textEditor.value?.textareaRef.select()
  })
}
const toast = useToast()
function command(action: (graph: DiagramGraph) => DiagramContent) {
  if (readonly) {
    return
  }
  try {
    emit('change', action(new DiagramGraph(content)))
  } catch (cause) {
    toast.add({ title: 'Unable to update diagram', description: errorMessage(cause), color: 'error' })
  }
}
function center() {
  const box = surface.value?.getBoundingClientRect()
  return box ? screenToFlowCoordinate({ x: box.x + box.width / 2, y: box.y + box.height / 2 }) : { x: 0, y: 0 }
}
function add(shape: DiagramNode['data']['shape']) {
  command((graph) => {
    const point = center()
    while (content.nodes.some(node => Math.abs(node.position.x - point.x) < 30 && Math.abs(node.position.y - point.y) < 30)) {
      point.x += 40
      point.y += 40
    }
    const next = graph.add(shape, point)
    selectedIds.value = [next.nodes.at(-1)!.id]
    selectedEdgeIds.value = []
    return next
  })
}
function publish() {
  if (readonly) {
    return
  }
  emit('change', { kind: 'diagram', nodes: nodes.value.map((node) => {
    const original = content.nodes.find(entry => entry.id === node.id)
    return { id: node.id, type: 'shape', position: original?.data.locked ? original.position : { x: clampCoordinate(node.position.x), y: clampCoordinate(node.position.y) }, data: { ...node.data! } }
  }), edges: edges.value.filter(edge => nodes.value.some(node => node.id === edge.source) && nodes.value.some(node => node.id === edge.target)).map(edge => ({ ...content.edges.find(entry => entry.id === edge.id), id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle || null, targetHandle: edge.targetHandle || null, label: typeof edge.label === 'string' ? edge.label : '', type: ['smoothstep', 'straight', 'step', 'default'].includes(edge.type || '') ? edge.type as DiagramEdge['type'] : 'smoothstep' })) })
}
function connect(connection: Connection) {
  if (connection.source && connection.target) {
    command(graph => graph.connect({ source: connection.source!, target: connection.target!, sourceHandle: connection.sourceHandle || null, targetHandle: connection.targetHandle || null }))
  }
}
function resize(id: string, params: ResizeParams) {
  const entry = nodes.value.find(node => node.id === id)
  if (!entry || readonly || entry.data?.locked) {
    return
  }
  entry.data = { ...entry.data!, width: Math.min(2000, Math.max(60, params.width)), height: Math.min(2000, Math.max(40, params.height)) }
  entry.position = { x: params.x, y: params.y }
  publish()
}
function updateNode(changes: Partial<DiagramNode['data']>) {
  command(graph => graph.updateMany(selectedIds.value, changes))
}
function dimension(axis: 'width' | 'height', value: string | number) {
  const number = Number(value)
  if (Number.isFinite(number)) {
    updateNode({ [axis]: Math.min(2000, Math.max(axis === 'width' ? 60 : 40, number)) })
  }
}
function updateEdge(changes: Partial<DiagramEdge>) {
  if (edge.value && !readonly) {
    emit('change', { ...content, edges: content.edges.map(entry => entry.id === edge.value!.id ? { ...entry, ...changes } : entry) })
  }
}
function reverseEdge() {
  if (!edge.value) {
    return
  }
  const old = edge.value
  updateEdge({ source: old.target, target: old.source, sourceHandle: old.targetHandle === 'top' ? 'bottom' : 'right', targetHandle: old.sourceHandle === 'bottom' ? 'top' : 'left' })
}
function drop(event: DragEvent) {
  const kind = event.dataTransfer?.getData('application/x-sele-shape')
  if (shapes.some(shape => shape.value === kind)) {
    command(graph => graph.add(kind as DiagramNode['data']['shape'], screenToFlowCoordinate({ x: event.clientX, y: event.clientY })))
  }
}
let clipboard: DiagramContent | null = null, pasteOffset = 0
function selectionContent(): DiagramContent {
  return JSON.parse(JSON.stringify({ kind: 'diagram', nodes: selectedNodes.value, edges: content.edges.filter(edge => selectedIds.value.includes(edge.source) && selectedIds.value.includes(edge.target)) }))
}
function insert(source: DiagramContent, offset = 40) {
  command((graph) => {
    const next = graph.insert(source, offset)
    selectedIds.value = next.nodes.slice(content.nodes.length).map(node => node.id)
    selectedEdgeIds.value = []
    return next
  })
}
function arrange(mode: Alignment) {
  command(graph => graph.align(selectedIds.value, mode))
}
function layout(direction: 'horizontal' | 'vertical' | 'grid') {
  command(graph => graph.layout(direction, selectedIds.value.length > 1 ? selectedIds.value : undefined))
  void nextTick(() => fitView({ padding: 0.2 }))
}
function template(kind: 'flowchart' | 'orgchart') {
  const point = content.nodes.length ? { x: Math.max(...content.nodes.map(node => node.position.x + node.data.width)) + 160, y: Math.min(...content.nodes.map(node => node.position.y)) } : center()
  insert(diagramTemplate(kind, point.x, point.y), 0)
  void nextTick(() => fitView({ padding: 0.2 }))
}
function findNext() {
  if (!matches.value.length) {
    return
  }
  const index = matches.value.findIndex(node => selectedIds.value.includes(node.id)), next = matches.value[(index + 1) % matches.value.length]!
  select([next.id])
  void nextTick(() => fitView({ nodes: [next.id], padding: 0.5, maxZoom: 1.5 }))
}
function keyboard(event: KeyboardEvent) {
  if (!(event.target as Element).closest('[data-canvas-surface]')) {
    return
  }
  if ((event.target as Element).closest('input,textarea,[contenteditable="true"]')) {
    return
  }
  const mod = event.ctrlKey || event.metaKey, key = event.key.toLowerCase()
  if (key === 'escape' && (selectedIds.value.length || selectedEdgeIds.value.length)) {
    select([])
    event.preventDefault()
    event.stopPropagation()
    event.stopPropagation()
    return
  }
  if (mod && key === 'a') {
    event.preventDefault()
    event.stopPropagation()
    select(content.nodes.map(node => node.id))
    return
  }
  if (mod && key === 'c' && selectedIds.value.length) {
    event.preventDefault()
    event.stopPropagation()
    clipboard = selectionContent()
    pasteOffset = 0
    return
  }
  if (readonly) {
    return
  }
  if (mod && key === 'v' && clipboard) {
    event.preventDefault()
    event.stopPropagation()
    pasteOffset += 40
    insert(clipboard, pasteOffset)
    return
  }
  if (mod && key === 'd' && selectedIds.value.length) {
    event.preventDefault()
    event.stopPropagation()
    insert(selectionContent())
    return
  }
  if (key === 'delete' || key === 'backspace') {
    event.preventDefault()
    event.stopPropagation()
    command(graph => graph.removeMany(selectedIds.value, selectedEdgeIds.value))
    return
  }
  const deltas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }, delta = deltas[event.key]
  if (delta && selectedIds.value.length) {
    event.preventDefault()
    event.stopPropagation()
    command(graph => graph.translate(selectedIds.value, delta[0] * (event.shiftKey ? 10 : 1), delta[1] * (event.shiftKey ? 10 : 1)))
  }
}
async function exportImage(png = false) {
  exporting.value = true
  try {
    const svg = new DiagramGraph(content).toSvg()
    if (png) {
      await exportCanvasPng(svg, 'diagram.png')
    } else {
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'diagram.svg')
    }
    toast.add({ title: png ? 'PNG exported' : 'SVG exported', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to export diagram', description: errorMessage(cause), color: 'error' })
  } finally {
    exporting.value = false
  }
}
const shapes = [{ value: 'rectangle', label: 'Process', icon: 'i-lucide-square' }, { value: 'ellipse', label: 'Start / end', icon: 'i-lucide-circle' }, { value: 'diamond', label: 'Decision', icon: 'i-lucide-diamond' }, { value: 'note', label: 'Note', icon: 'i-lucide-sticky-note' }, { value: 'cylinder', label: 'Database', icon: 'i-lucide-database' }, { value: 'parallelogram', label: 'Input / output', icon: 'i-lucide-scan-line' }, { value: 'hexagon', label: 'Preparation', icon: 'i-lucide-hexagon' }] as const
</script>

<template>
  <section
    class="space-y-ui-md canvas-editor"
    aria-label="Diagram editor"
    @keydown.capture="keyboard"
  >
    <EditorToolbar label="Diagram tools">
      <UButton
        aria-label="Select shapes"
        icon="i-lucide-mouse-pointer-2"
        size="sm"
        color="neutral"
        :variant="!pan ? 'soft' : 'ghost'"
        :aria-pressed="!pan"
        @click="pan = false"
      />
      <UButton
        aria-label="Pan diagram"
        icon="i-lucide-hand"
        size="sm"
        color="neutral"
        :variant="pan ? 'soft' : 'ghost'"
        :aria-pressed="pan"
        @click="pan = true"
      />
      <template v-if="!readonly">
        <UDropdownMenu :items="shapes.map(shape => ({ label: shape.label, icon: shape.icon, onSelect: () => add(shape.value) }))">
          <UButton
            label="Add shape"
            icon="i-lucide-shapes"
            size="sm"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
        <UDropdownMenu :items="[{ label: 'Decision flowchart', onSelect: () => template('flowchart') }, { label: 'Organization chart', onSelect: () => template('orgchart') }]">
          <UButton
            label="Templates"
            icon="i-lucide-layout-template"
            size="sm"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
        <UDropdownMenu :items="[{ label: 'Arrange left to right', onSelect: () => layout('horizontal') }, { label: 'Arrange top to bottom', onSelect: () => layout('vertical') }, { label: 'Arrange in a grid', onSelect: () => layout('grid') }]">
          <UButton
            label="Layout"
            icon="i-lucide-workflow"
            size="sm"
            color="neutral"
            variant="ghost"
            :disabled="!content.nodes.some(node => !node.data.locked)"
          />
        </UDropdownMenu>
      </template>
      <template #actions>
        <UButton
          icon="i-lucide-grid-2x2"
          aria-label="Toggle grid"
          size="sm"
          color="neutral"
          :variant="grid ? 'soft' : 'ghost'"
          :aria-pressed="grid"
          @click="grid = !grid"
        />
        <UButton
          v-if="!readonly"
          label="Snap"
          icon="i-lucide-magnet"
          size="sm"
          color="neutral"
          :variant="snap ? 'soft' : 'ghost'"
          :aria-pressed="snap"
          @click="snap = !snap"
        />
        <UButton
          :label="`${Math.round(viewport.zoom * 100)}%`"
          aria-label="Reset zoom to 100%"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="zoomTo(1)"
        />
        <UButton
          size="sm"
          icon="i-lucide-scan"
          label="Fit"
          aria-label="Fit diagram"
          color="neutral"
          variant="ghost"
          @click="fitView({ padding: 0.2 })"
        />
        <UButton
          size="sm"
          label="Minimap"
          icon="i-lucide-map"
          color="neutral"
          :variant="minimap ? 'soft' : 'ghost'"
          :aria-pressed="minimap"
          @click="minimap = !minimap"
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
            aria-label="Diagram shortcuts"
            size="sm"
            color="neutral"
            variant="ghost"
          /><template #content>
            <div class="p-ui-lg space-y-ui-sm text-sm max-w-sidebar-mobile">
              <p class="font-medium">
                Diagram shortcuts
              </p><p>Drag empty space in Select mode to select a region. Shift-click adds objects. Hold Space or switch to Pan to explore.</p><p>Ctrl/⌘ A select all · C copy · V paste · D duplicate · Z undo</p><p>Arrow keys move · Shift + arrow moves 10 · Delete removes unlocked shapes and selected connectors · Esc clears selection</p><p>Drag an outgoing handle to an incoming handle to connect. Drag connector endpoints to reconnect.</p>
            </div>
          </template>
        </UPopover>
      </template>
    </EditorToolbar>
    <div class="flex flex-wrap items-center gap-ui-sm">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a shape…"
        aria-label="Find a shape"
        size="sm"
        @keydown.enter.prevent="findNext"
      />
      <UButton
        v-if="search.trim()"
        :label="matches.length ? `Next (${matches.length} matches)` : 'No matches'"
        size="sm"
        color="neutral"
        variant="ghost"
        :disabled="!matches.length"
        @click="findNext"
      />
      <span class="text-xs text-muted ms-auto">{{ selectedNodes.length }} selected</span>
    </div>
    <div
      v-if="selectedNodes.length"
      class="editor-context-toolbar"
      role="group"
      aria-label="Selected shapes"
    >
      <UButton
        v-if="node && canComment"
        size="sm"
        label="Comment"
        icon="i-lucide-message-square"
        color="neutral"
        variant="ghost"
        @click="emit('comment', node.id, 'node', node.data.label)"
      />
      <ItemResourcesButton
        v-if="node"
        :item-id="itemId"
        :anchor="{ type: 'node', id: node.id }"
        :readonly="readonly"
        :prepare="prepareResources"
      />
      <template v-if="!readonly">
        <UTextarea
          v-if="node"
          ref="textEditor"
          size="sm"
          :model-value="node.data.label"
          :rows="1"
          autoresize
          :maxrows="5"
          :maxlength="4000"
          aria-label="Shape text"
          class="flex-1"
          :disabled="node.data.locked"
          @update:model-value="updateNode({ label: String($event) })"
        />
        <USelect
          v-if="node"
          size="sm"
          :model-value="node.data.shape"
          :items="shapes.map(shape => ({ label: shape.label, value: shape.value }))"
          aria-label="Shape type"
          :disabled="node.data.locked"
          @update:model-value="updateNode({ shape: $event })"
        />
        <USelect
          size="sm"
          :model-value="appearance.color"
          :items="[{ label: 'Mixed borders', value: '__mixed', disabled: true }, ...canvasPalette]"
          aria-label="Shape border color"
          :disabled="!editable.length"
          @update:model-value="updateNode({ color: String($event) })"
        />
        <USelect
          size="sm"
          :model-value="appearance.fill"
          :items="[{ label: 'Mixed fills', value: '__mixed', disabled: true }, { label: 'Default fill', value: '__none' }, ...canvasPalette]"
          aria-label="Shape fill color"
          :disabled="!editable.length"
          @update:model-value="updateNode({ fill: $event === '__none' ? undefined : String($event) })"
        />
        <USelect
          size="sm"
          :model-value="appearance.fontSize"
          :items="[{ label: 'Mixed sizes', value: 0, disabled: true }, ...[12, 14, 18, 24, 32, 48].map(value => ({ label: String(value), value }))]"
          aria-label="Shape font size"
          :disabled="!editable.length"
          @update:model-value="updateNode({ fontSize: Number($event) })"
        />
        <UInput
          v-if="node"
          :model-value="node.data.width"
          type="number"
          :min="60"
          :max="2000"
          size="sm"
          aria-label="Shape width"
          class="w-ui-10xl"
          :disabled="node.data.locked"
          @change="dimension('width', ($event.target as HTMLInputElement).value)"
        />
        <UInput
          v-if="node"
          :model-value="node.data.height"
          type="number"
          :min="40"
          :max="2000"
          size="sm"
          aria-label="Shape height"
          class="w-ui-10xl"
          :disabled="node.data.locked"
          @change="dimension('height', ($event.target as HTMLInputElement).value)"
        />
        <UButton
          label="Dashed"
          size="sm"
          color="neutral"
          :variant="selectedNodes.every(node => node.data.dashed) ? 'soft' : 'ghost'"
          :disabled="!editable.length"
          @click="updateNode({ dashed: !selectedNodes.every(node => node.data.dashed) })"
        />
        <SelectionArrange
          :count="editable.length"
          @align="arrange"
        />
        <UButton
          :label="selectedNodes.every(node => node.data.locked) ? 'Unlock' : 'Lock'"
          :icon="selectedNodes.every(node => node.data.locked) ? 'i-lucide-lock-open' : 'i-lucide-lock'"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="command(graph => graph.updateMany(selectedIds, { locked: !selectedNodes.every(node => node.data.locked) }, true))"
        />
        <UButton
          size="sm"
          icon="i-lucide-copy"
          label="Duplicate"
          color="neutral"
          variant="ghost"
          @click="insert(selectionContent())"
        />
        <UButton
          size="sm"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          label="Delete"
          :disabled="!editable.length"
          @click="command(graph => graph.removeMany(selectedIds))"
        />
      </template>
    </div>
    <div
      v-if="edge"
      class="editor-context-toolbar"
      role="group"
      aria-label="Selected connector"
    >
      <UButton
        v-if="canComment"
        size="sm"
        label="Comment"
        icon="i-lucide-message-square"
        color="neutral"
        variant="ghost"
        @click="emit('comment', edge.id, 'edge', edge.label || 'Connector')"
      />
      <template v-if="!readonly">
        <UInput
          size="sm"
          :model-value="edge.label"
          placeholder="Connector label"
          aria-label="Connector label"
          :maxlength="255"
          @update:model-value="updateEdge({ label: String($event) })"
        />
        <USelect
          size="sm"
          :model-value="edge.type"
          :items="[{ label: 'Rounded elbow', value: 'smoothstep' }, { label: 'Straight', value: 'straight' }, { label: 'Elbow', value: 'step' }, { label: 'Curve', value: 'default' }]"
          aria-label="Connector style"
          @update:model-value="updateEdge({ type: $event as DiagramEdge['type'] })"
        />
        <USelect
          size="sm"
          :model-value="edge.color || '#71717a'"
          :items="canvasPalette"
          aria-label="Connector color"
          @update:model-value="updateEdge({ color: String($event) })"
        />
        <USelect
          size="sm"
          :model-value="edge.arrow || 'end'"
          :items="[{ label: 'End arrow', value: 'end' }, { label: 'Both arrows', value: 'both' }, { label: 'No arrows', value: 'none' }]"
          aria-label="Connector arrows"
          @update:model-value="updateEdge({ arrow: $event as DiagramEdge['arrow'] })"
        />
        <UButton
          size="sm"
          label="Dashed"
          color="neutral"
          :variant="edge.dashed ? 'soft' : 'ghost'"
          @click="updateEdge({ dashed: !edge.dashed })"
        />
        <UButton
          size="sm"
          label="Animate"
          color="neutral"
          :variant="edge.animated ? 'soft' : 'ghost'"
          @click="updateEdge({ animated: !edge.animated })"
        />
        <UButton
          size="sm"
          label="Reverse"
          icon="i-lucide-arrow-right-left"
          color="neutral"
          variant="ghost"
          @click="reverseEdge"
        />
        <UButton
          size="sm"
          label="Delete connector"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          @click="command(graph => graph.removeMany([], [edge!.id]))"
        />
      </template>
    </div>
    <div
      ref="surface"
      data-canvas-surface
      tabindex="0"
      class="relative canvas-surface h-studio border border-muted rounded-sm overflow-hidden bg-default outline-none focus-visible:ring-1 focus-visible:ring-accented"
      aria-label="Diagram canvas"
      @pointermove="emit('presence', { cursor: screenToFlowCoordinate({ x: $event.clientX, y: $event.clientY }), selected: selectedIds })"
      @pointerleave="emit('presence', { cursor: null, selected: selectedIds })"
      @dragover.prevent
      @drop.prevent="drop"
      @pointerdown="surface?.focus({ preventScroll: true })"
    >
      <VueFlow
        :id="flowId"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :only-render-visible-elements="true"
        :nodes-draggable="!readonly"
        :nodes-connectable="!readonly"
        :edges-updatable="!readonly"
        :delete-key-code="null"
        :multi-selection-key-code="['Shift', 'Meta', 'Control']"
        :selection-key-code="pan ? null : true"
        :selection-mode="SelectionMode.Partial"
        :pan-on-drag="pan ? true : [1, 2]"
        :min-zoom="0.1"
        :max-zoom="4"
        fit-view-on-init
        :snap-to-grid="snap"
        :snap-grid="[20, 20]"
        @connect="connect"
        @node-double-click="editText($event.node.id)"
        @node-drag-stop="publish"
        @selection-drag-stop="publish"
        @edge-update="({ edge, connection }) => { if (!readonly) { edges = edges.map(entry => entry.id === edge.id ? { ...entry, ...connection } : entry); publish() } }"
      >
        <template #node-shape="props">
          <DiagramShape
            v-bind="props"
            :readonly="readonly"
            @resize="resize"
          />
        </template>
        <Background
          v-if="grid"
          :gap="20"
          pattern-color="var(--ui-border-muted)"
        /><Controls :show-interactive="false" /><MiniMap
          v-if="minimap"
          pannable
          zoomable
        />
      </VueFlow>
      <div
        v-for="member in collaborators.filter(member => member.cursor)"
        :key="member.sessionId"
        class="absolute pointer-events-none text-xs"
        :style="{ left: `${viewport.x + member.cursor!.x * viewport.zoom}px`, top: `${viewport.y + member.cursor!.y * viewport.zoom}px`, color: member.color }"
      >
        <UIcon
          name="i-lucide-mouse-pointer-2"
          class="size-ui-lg"
        />{{ member.name }}
      </div>
    </div>
    <p class="text-xs text-muted">
      {{ content.nodes.length }} shapes · {{ content.edges.length }} connectors · {{ content.nodes.filter(node => node.data.locked).length }} locked · Shift-click or drag a region to select · Space to pan
    </p>
  </section>
</template>

<style scoped>
:deep(.vue-flow) { --vf-node-bg: var(--ui-bg); --vf-node-text: var(--ui-text); --vf-node-color: var(--ui-border); --vf-handle: var(--ui-text-muted); }
:deep(.vue-flow__controls-button) { background: var(--ui-bg); color: var(--ui-text); border-color: var(--ui-border-muted); }
:deep(.vue-flow__controls-button svg) { fill: currentColor; }
:deep(.vue-flow__edge-textbg) { fill: var(--ui-bg); }
:deep(.vue-flow__edge-text) { fill: var(--ui-text); }
:deep(.vue-flow__minimap) { background: var(--ui-bg); }
</style>
