<script setup lang="ts">
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import type { Node, Edge, Connection } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { ResizeParams } from '@vue-flow/node-resizer'
import type { DiagramContent, DiagramNode } from '#shared/kernel/content'
import { canvasPalette } from '~/features/canvases/presentation/canvasPalette'
import { DiagramGraph } from '../domain/DiagramGraph'
import DiagramShape from './DiagramShape.vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'

const { content, readonly = false } = defineProps<{
  content: DiagramContent
  readonly?: boolean
}>()
const emit = defineEmits<{
  change: [
        content: DiagramContent
  ]
}>()
const flowId = useId()
const { screenToFlowCoordinate, fitView } = useVueFlow(flowId)
const nodes = shallowRef<Node<DiagramNode['data']>[]>([]), edges = shallowRef<Edge[]>([])
const selectedNode = ref<string | null>(null), selectedEdge = ref<string | null>(null), minimap = ref(false)
const node = computed(() => content.nodes.find(node => node.id === selectedNode.value))
const edge = computed(() => content.edges.find(edge => edge.id === selectedEdge.value))
const surface = useTemplateRef<HTMLDivElement>('surface')
watch(() => content, () => {
  nodes.value = content.nodes.map(node => ({ ...JSON.parse(JSON.stringify(node)), selected: selectedNode.value === node.id, style: { width: `${node.data.width}px`, height: `${node.data.height}px` } }))
  edges.value = content.edges.map(edge => ({ ...edge, selected: selectedEdge.value === edge.id, markerEnd: MarkerType.ArrowClosed, updatable: !readonly }))
}, { immediate: true })
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
function add(shape: DiagramNode['data']['shape']) {
  const box = surface.value?.getBoundingClientRect()
  const position = box ? screenToFlowCoordinate({ x: box.x + box.width / 2, y: box.y + box.height / 2 }) : { x: 0, y: 0 }
  command(graph => graph.add(shape, position))
}
function publish() {
  if (readonly) {
    return
  }
  emit('change', { kind: 'diagram', nodes: nodes.value.map(node => ({ id: node.id, type: 'shape', position: { x: node.position.x, y: node.position.y }, data: { ...node.data! } })), edges: edges.value.filter(edge => nodes.value.some(node => node.id === edge.source) && nodes.value.some(node => node.id === edge.target)).map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle || null, targetHandle: edge.targetHandle || null, label: typeof edge.label === 'string' ? edge.label : '', type: ['smoothstep', 'straight', 'step'].includes(edge.type || '') ? edge.type as 'smoothstep' | 'straight' | 'step' : 'smoothstep' })) })
}
function connect(connection: Connection) {
  if (connection.source && connection.target) {
    command(graph => graph.connect({ source: connection.source!, target: connection.target!, sourceHandle: connection.sourceHandle || null, targetHandle: connection.targetHandle || null }))
  }
}
function resize(id: string, params: ResizeParams) {
  const entry = nodes.value.find(node => node.id === id)
  if (!entry || readonly) {
    return
  }
  entry.data = { ...entry.data!, width: params.width, height: params.height }
  entry.position = { x: params.x, y: params.y }
  publish()
}
function updateNode(changes: Partial<DiagramNode['data']>) {
  if (node.value && !readonly) {
    emit('change', { ...content, nodes: content.nodes.map(entry => entry.id === node.value!.id ? { ...entry, data: { ...entry.data, ...changes } } : entry) })
  }
}
function updateEdge(changes: Partial<DiagramContent['edges'][number]>) {
  if (edge.value && !readonly) {
    emit('change', { ...content, edges: content.edges.map(entry => entry.id === edge.value!.id ? { ...entry, ...changes } : entry) })
  }
}
function drop(event: DragEvent) {
  const kind = event.dataTransfer?.getData('application/x-sele-shape')
  if (['rectangle', 'ellipse', 'diamond', 'note'].includes(kind || '')) {
    command(graph => graph.add(kind as DiagramNode['data']['shape'], screenToFlowCoordinate({ x: event.clientX, y: event.clientY })))
  }
}
function exportSvg() {
  downloadBlob(new Blob([new DiagramGraph(content).toSvg()], { type: 'image/svg+xml' }), 'diagram.svg')
}
const shapes = [{ value: 'rectangle', label: 'Process', icon: 'i-lucide-square' }, { value: 'ellipse', label: 'Start / end', icon: 'i-lucide-circle' }, { value: 'diamond', label: 'Decision', icon: 'i-lucide-diamond' }, { value: 'note', label: 'Note', icon: 'i-lucide-sticky-note' }] as const
</script>

<template>
  <section
    class="space-y-ui-md"
    aria-label="Diagram editor"
  >
    <div class="editor-tools">
      <template v-if="!readonly">
        <UButton
          v-for="shape in shapes"
          :key="shape.value"
          :label="shape.label"
          :icon="shape.icon"
          color="neutral"
          variant="ghost"
          draggable="true"
          @dragstart="$event.dataTransfer?.setData('application/x-sele-shape', shape.value)"
          @click="add(shape.value)"
        />
      </template>
      <UButton
        label="SVG"
        icon="i-lucide-download"
        color="neutral"
        variant="ghost"
        @click="exportSvg"
      />
      <UButton
        icon="i-lucide-scan"
        label="Fit"
        color="neutral"
        variant="ghost"
        class="ms-auto"
        @click="fitView({ padding: 0.2 })"
      /><UButton
        label="Minimap"
        icon="i-lucide-map"
        color="neutral"
        :variant="minimap ? 'soft' : 'ghost'"
        @click="minimap = !minimap"
      />
    </div>
    <div
      v-if="node && !readonly"
      class="flex flex-wrap items-center gap-ui-sm border-t border-muted pt-ui-md"
    >
      <UTextarea
        :model-value="node.data.label"
        :rows="1"
        autoresize
        :maxrows="5"
        :maxlength="4000"
        aria-label="Shape text"
        class="flex-1"
        @update:model-value="updateNode({ label: String($event) })"
      /><USelect
        :model-value="node.data.shape"
        :items="shapes.map(shape => ({ label: shape.label, value: shape.value }))"
        aria-label="Shape type"
        @update:model-value="updateNode({ shape: $event })"
      /><USelect
        :model-value="node.data.color"
        :items="canvasPalette"
        aria-label="Shape color"
        @update:model-value="updateNode({ color: $event })"
      /><UButton
        icon="i-lucide-copy"
        label="Duplicate"
        color="neutral"
        variant="ghost"
        @click="command(graph => graph.duplicate(node!.id))"
      /><UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        label="Delete"
        @click="command(graph => graph.removeNode(node!.id))"
      />
    </div>
    <div
      v-if="edge && !readonly"
      class="flex flex-wrap items-center gap-ui-sm"
    >
      <UInput
        :model-value="edge.label"
        placeholder="Connector label"
        aria-label="Connector label"
        :maxlength="255"
        @update:model-value="updateEdge({ label: String($event) })"
      /><USelect
        :model-value="edge.type"
        :items="['smoothstep', 'straight', 'step']"
        aria-label="Connector style"
        @update:model-value="updateEdge({ type: $event as 'smoothstep' | 'straight' | 'step' })"
      /><UButton
        label="Delete connector"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        @click="emit('change', { ...content, edges: content.edges.filter(entry => entry.id !== edge!.id) })"
      />
    </div>
    <div
      ref="surface"
      class="h-studio border border-muted rounded-sm overflow-hidden bg-default"
      @dragover.prevent
      @drop.prevent="drop"
    >
      <VueFlow
        :id="flowId"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :nodes-draggable="!readonly"
        :nodes-connectable="!readonly"
        :edges-updatable="!readonly"
        :delete-key-code="readonly ? null : ['Backspace', 'Delete']"
        :min-zoom="0.1"
        :max-zoom="4"
        fit-view-on-init
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        @connect="connect"
        @node-drag-stop="publish"
        @nodes-delete="publish"
        @edges-delete="publish"
        @node-click="selectedNode = $event.node.id; selectedEdge = null"
        @edge-click="selectedEdge = $event.edge.id; selectedNode = null"
        @pane-click="selectedNode = null; selectedEdge = null"
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
          :gap="20"
          pattern-color="var(--ui-border-muted)"
        /><Controls :show-interactive="false" /><MiniMap
          v-if="minimap"
          pannable
          zoomable
        />
      </VueFlow>
    </div>
    <p class="text-xs text-muted">
      {{ content.nodes.length }} shapes · {{ content.edges.length }} connectors · Drag from an outgoing handle to connect shapes · Select shapes to resize or edit
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
