<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { useApi } from '~/core/http/useApi'
import DetailPanel from '~/components/ui/DetailPanel.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import type { ItemAttachment, ObjectReference } from '#shared/model/itemResources'
import type { LibraryEntry } from '#shared/model/library'
import { useDebounce } from '@vueuse/core'

const { itemId, anchor = null, readonly = false, prepare } = defineProps<{
  itemId?: string
  anchor?: ObjectReference | null
  readonly?: boolean
  prepare?: () => Promise<void>
}>()
const toast = useToast()
const api = useApi(), open = ref(false), busy = ref(false), canEdit = ref(false), error = ref(''), preview = ref<ItemAttachment | null>(null), deleting = ref<string | null>(null)
const data = ref<Awaited<ReturnType<typeof api.itemResources.list>>['data']>({ attachments: [], relations: [] })
const upload = useTemplateRef<HTMLInputElement>('upload'), search = ref(''), target = ref('__none'), targetObject = ref('__item'), relationLabel = ref('Related')
const debounced = useDebounce(search, 250), results = ref<LibraryEntry[]>([]), targetObjects = ref<(ObjectReference & {
  label: string
})[]>([])
const deleteOpen = computed({ get: () => !!deleting.value, set: (value: boolean) => {
  if (!value) {
    deleting.value = null
  }
} })
const matchesAnchor = (value: ObjectReference | null) => !anchor || (value?.id === anchor.id && value.type === anchor.type)
const attachments = computed(() => data.value.attachments.filter(file => matchesAnchor(file.anchor)))
const relations = computed(() => data.value.relations.filter(link => matchesAnchor(link.sourceAnchor)))
useRealtimeEffect(`item-resources:${itemId}`, { topics: ['attachments', 'relations', 'items', 'access', 'members', 'groups', 'folders', 'workspaces'] }, async () => {
  if (!open.value || !itemId) {
    return
  }
  try {
    const item = (await api.items.get(itemId)).data
    canEdit.value = !readonly && item.accessLevel === 'edit' && !item.archivedAt
    await refresh()
    if (preview.value && !data.value.attachments.some(file => file.id === preview.value?.id)) {
      preview.value = null
    }
  } catch (cause) {
    data.value = { attachments: [], relations: [] }
    preview.value = null
    canEdit.value = false
    error.value = errorMessage(cause)
  }
})
useFeedbackToast(error, { key: `extras:${itemId || ''}`, title: 'Unable to update files or links', retry: refresh })
const fileUrl = (file: ItemAttachment, download = false) => `/api/items/${file.itemId}/attachments/${file.id}/content${download ? '?download=1' : ''}`
async function refresh() {
  if (!itemId) {
    return
  }
  error.value = ''
  try {
    data.value = (await api.itemResources.list(itemId)).data
  } catch (cause) {
    error.value = errorMessage(cause)
  }
}
async function show() {
  if (!itemId) {
    return
  }
  busy.value = true
  try {
    await prepare?.()
    const item = (await api.items.get(itemId)).data
    canEdit.value = !readonly && item.accessLevel === 'edit' && !item.archivedAt
    open.value = true
    await refresh()
  } catch (cause) {
    toast.add({ title: 'Unable to open files and links', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = false
  }
}
watch(debounced, async (value) => {
  try {
    results.value = value.trim() ? (await api.library.search(value)).data.filter(item => item.kind === 'item' && (item.id !== itemId || !!anchor)) : []
  } catch {
    results.value = []
  }
})
watch(target, async (id, _previous, onCleanup) => {
  let stale = false
  onCleanup(() => {
    stale = true
  })
  targetObjects.value = []
  targetObject.value = '__item'
  if (id === '__none') {
    return
  }
  try {
    const item = (await api.items.get(id)).data
    if (item.kind === 'document') {
      return
    }
    const content = (await api.canvases.get(id)).data.content
    if (stale) {
      return
    }
    targetObjects.value = content.kind === 'kanban' ? content.tasks.map(task => ({ id: task.id, type: 'task', label: `#${task.number} ${task.title}` })) : content.kind === 'whiteboard' ? content.elements.map((element, index) => ({ id: element.id, type: 'element', label: element.text || `${element.type} ${index + 1}` })) : [...content.nodes.map(node => ({ id: node.id, type: 'node' as const, label: node.data.label })), ...content.edges.map(edge => ({ id: edge.id, type: 'edge' as const, label: edge.label || 'Connector' }))]
  } catch (cause) {
    error.value = errorMessage(cause)
  }
})
async function attach(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !itemId) {
    return
  }
  busy.value = true
  try {
    await prepare?.()
    await api.itemResources.attach(itemId, file, anchor)
    await refresh()
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
    if (upload.value) {
      upload.value.value = ''
    }
  }
}
async function relate() {
  if (!itemId || target.value === '__none') {
    return
  }
  busy.value = true
  try {
    await prepare?.()
    const reference = targetObjects.value.find(value => value.id === targetObject.value)
    await api.itemResources.relate(itemId, target.value, anchor, reference ? { id: reference.id, type: reference.type } : null, relationLabel.value.trim() || 'Related')
    await refresh()
    target.value = '__none'
    search.value = ''
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
async function removeAttachment() {
  if (itemId && deleting.value) {
    await api.itemResources.detach(itemId, deleting.value)
    preview.value = null
    await refresh()
  }
}
async function unlink(id: string) {
  if (!itemId) {
    return
  }
  try {
    await api.itemResources.unlink(itemId, id)
    await refresh()
  } catch (cause) {
    error.value = errorMessage(cause)
  }
}
</script>

<template>
  <template v-if="itemId">
    <UButton
      label="Files / links"
      icon="i-lucide-paperclip"
      aria-label="Files and related items"
      size="sm"
      color="neutral"
      variant="ghost"
      :loading="busy"
      @click="show"
    />
    <DetailPanel
      v-model:open="open"
      title="Files and related items"
      description="Attachments and connections for this item or selected object"
      icon="i-lucide-paperclip"
      wide
    >
      <template #body>
        <div class="p-ui-xl space-y-ui-xl">
          <p
            v-if="anchor"
            class="text-xs text-muted"
          >
            Showing files and links attached to the selected {{ anchor.type }}.
          </p>
          <div
            v-if="error"
          >
            <DataRetry :on-retry="refresh" />
          </div>
          <section
            class="space-y-ui-md"
            aria-label="Attachments"
          >
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium">
                Attachments
              </h3><UButton
                v-if="canEdit"
                label="Upload file"
                icon="i-lucide-upload"
                size="sm"
                color="neutral"
                variant="ghost"
                :loading="busy"
                @click="upload?.click()"
              />
            </div><p class="text-xs text-muted">
              Images, PDF, text, ZIP and Office files · up to 10 MB per file
            </p><input
              ref="upload"
              type="file"
              class="sr-only"
              aria-label="Choose attachment"
              @change="attach"
            >
            <div
              v-for="file in attachments"
              :key="file.id"
              class="flex items-center gap-ui-sm rounded-md border border-muted p-ui-md"
            >
              <UIcon
                :name="file.mime.startsWith('image/') ? 'i-lucide-image' : 'i-lucide-file'"
                class="size-ui-lg text-muted"
              /><div class="min-w-ui-zero flex-1">
                <p class="truncate text-sm">
                  {{ file.name }}
                </p><p class="text-xs text-muted">
                  {{ Math.ceil(file.size / 1024) }} KB
                </p>
              </div><UButton
                v-if="file.mime.startsWith('image/') || ['application/pdf', 'text/plain'].includes(file.mime)"
                label="Preview"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="preview = file"
              /><UButton
                :href="fileUrl(file, true)"
                label="Download"
                icon="i-lucide-download"
                size="sm"
                color="neutral"
                variant="ghost"
              /><UButton
                v-if="canEdit"
                icon="i-lucide-trash-2"
                :aria-label="`Delete attachment ${file.name}`"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="deleting = file.id"
              />
            </div>
            <p
              v-if="!attachments.length"
              class="text-xs text-muted"
            >
              No attachments yet.
            </p>
          </section>
          <section
            class="space-y-ui-md"
            aria-label="Related items"
          >
            <h3 class="text-sm font-medium">
              Related items
            </h3><div
              v-for="link in relations"
              :key="link.id"
              class="flex items-center gap-ui-sm"
            >
              <NuxtLink
                :to="{ path: `/workspaces/${link.workspaceId}/items/${link.targetId}`, query: link.targetAnchor ? link.targetAnchor.type === 'task' ? { task: link.targetAnchor.id } : { object: link.targetAnchor.id } : {} }"
                class="min-w-ui-zero flex-1 rounded-md hover:bg-muted p-ui-md"
              ><p class="text-sm">{{ link.targetTitle }}</p><p class="text-xs text-muted">{{ link.label }} · {{ link.targetKind }}{{ link.targetAnchor ? ` · ${link.targetAnchor.type}` : '' }}</p></NuxtLink><UButton
                v-if="canEdit && link.outgoing !== false"
                icon="i-lucide-unlink"
                aria-label="Remove relation"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="unlink(link.id)"
              />
            </div><p
              v-if="!relations.length"
              class="text-xs text-muted"
            >
              No related items yet.
            </p>
            <div
              v-if="canEdit"
              class="space-y-ui-sm border-t border-muted pt-ui-md"
            >
              <UInput
                v-model="search"
                placeholder="Search an item to link…"
                aria-label="Find related item"
                class="w-full"
              /><USelect
                v-if="results.length"
                v-model="target"
                :items="[{ label: 'Choose an item', value: '__none' }, ...results.map(item => ({ label: item.title, value: item.id }))]"
                aria-label="Related item"
                class="w-full"
              /><USelect
                v-if="targetObjects.length"
                v-model="targetObject"
                :items="[{ label: 'Whole item', value: '__item' }, ...targetObjects.map(object => ({ label: object.label, value: object.id }))]"
                aria-label="Related object"
                class="w-full"
              /><UInput
                v-if="target !== '__none'"
                v-model="relationLabel"
                placeholder="Relationship"
                aria-label="Relationship label"
                :maxlength="120"
                class="w-full"
              /><UButton
                label="Add relation"
                size="sm"
                :disabled="target === '__none'"
                :loading="busy"
                @click="relate"
              />
            </div>
          </section>
        </div>
      </template>
    </DetailPanel>
    <UModal
      :open="!!preview"
      :title="preview?.name || 'Attachment preview'"
      description="Attachment preview"
      :ui="{ content: 'max-w-panel-lg' }"
      @update:open="value => { if (!value) preview = null }"
    >
      <template #body>
        <img
          v-if="preview?.mime.startsWith('image/')"
          :src="fileUrl(preview)"
          :alt="preview.name"
          class="max-w-full max-h-studio mx-auto"
        ><iframe
          v-else-if="preview"
          :src="fileUrl(preview)"
          :title="preview.name"
          class="w-full h-studio border-0"
        />
      </template>
    </UModal>
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete attachment"
      description="This file will be permanently removed. Existing references to this file will stop working."
      :on-confirm="removeAttachment"
    />
  </template>
</template>
