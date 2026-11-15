<script setup lang="ts">
import ItemHeader from '~/features/items/components/ItemHeader.vue'
import type { ContentItem } from '#shared/model/item'
import type { WorkspaceOverview } from '#shared/model/workspace'
import { itemTypeLabels } from '#shared/model/content'
import { canvasContentSchema } from '#shared/validation/canvas'
import { allowsWorkspaceAction } from '#shared/model/workspaceSettings'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import ItemMetadata from '~/features/items/components/ItemMetadata.vue'
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'
import ItemToolbar from '~/features/items/components/ItemToolbar.vue'
import { useItemActions } from '~/features/items/composables/useItemActions'
import { refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useApi } from '~/core/http/useApi'
import { useAuth } from '~/features/authentication/composables/useAuth'
import { useItemComments } from '~/features/comments/composables/useItemComments'
import CommentPanel from '~/features/comments/components/CommentPanel.vue'
import { useCanvasPresence } from '../composables/useCanvasPresence'
import { useCanvas } from '../composables/useCanvas'
import { useContentFullscreen } from '~/core/layout/useContentFullscreen'

const { isFullscreen, toggle: toggleFullscreen } = useContentFullscreen()
const KanbanEditor = defineAsyncComponent(() => import('~/features/kanban/components/KanbanEditor.vue'))
const WhiteboardEditor = defineAsyncComponent(() => import('~/features/whiteboard/components/WhiteboardEditor.vue'))
const DiagramEditor = defineAsyncComponent(() => import('~/features/diagrams/components/DiagramEditor.vue'))
const { item, overview } = defineProps<{
  item: ContentItem
  overview: WorkspaceOverview
}>()
const emit = defineEmits<{
  updated: [
        item: ContentItem
  ]
}>()
const readonly = computed(() => item.accessLevel !== 'edit' || !!item.archivedAt || !!overview.workspace.archivedAt)
const { recovered, restoreDraft, discardRecovered, session, query, failed, edit, save: saveContent, overwrite } = useCanvas(item.id, item.workspaceId, () => readonly.value)
async function prepareResources() {
  if (session.value?.saving) {
    await new Promise<void>((resolve) => {
      const stop = watch(() => session.value?.saving, (value) => {
        if (!value) {
          stop()
          resolve()
        }
      })
    })
  }
  await saveContent()
  if (session.value?.dirty || recovered.value) {
    throw new Error('Save or resolve your draft before adding files or links')
  }
}
const presence = useCanvasPresence(item.id)
const { state: auth } = useAuth()
const editor = ref<{
  selectObject: (id: string) => boolean
} | null>(null)
const canComment = computed(() => ['edit', 'comment'].includes(item.accessLevel) && !item.archivedAt && !overview.workspace.archivedAt && !recovered.value)
const comments = useItemComments(item.id, ref(null), { onObjectJump: id => editor.value?.selectObject(id) || false })
const route = useRoute()
watch([() => route.query.comment, comments.threads], ([id]) => {
  if (typeof id === 'string') {
    comments.select(id)
  }
}, { immediate: true })
watch([() => route.query.object, editor], ([id]) => {
  if (typeof id === 'string') {
    editor.value?.selectObject(id)
  }
}, { immediate: true })
async function startComment(id: string, type: 'task' | 'element' | 'node' | 'edge', label: string) {
  if (!canComment.value) {
    return
  }
  if (session.value?.dirty) {
    await saveContent()
  }
  if (session.value?.dirty) {
    toast.add({ title: 'Save your changes before commenting', color: 'warning' })
    return
  }
  comments.startObject(id, type, label)
}
const { save: saveMetadata, remove: removeItem } = useItemActions(() => item, current => emit('updated', current))
const canLifecycle = computed(() => item.accessLevel === 'edit' && !overview.workspace.archivedAt && allowsWorkspaceAction(overview.workspace.role, overview.workspace.settings, 'deleteContent'))
const file = useTemplateRef<HTMLInputElement>('file')
const deleteOpen = ref(false), replaceOpen = ref(false), reloadOpen = ref(false), accessOpen = ref(false)
const toast = useToast(), api = useApi(), lifecycleBusy = ref(false)
const status = computed(() => readonly.value ? 'Read-only' : session.value?.saving ? 'Saving…' : session.value?.remote ? 'Review newer version' : failed.value ? 'Retry save' : session.value?.dirty ? 'Unsaved changes' : 'All changes saved')
onMounted(() => {
})
async function lifecycle(archived: boolean) {
  if (lifecycleBusy.value) {
    return
  }
  lifecycleBusy.value = true
  try {
    if (session.value?.dirty) {
      await saveContent()
      if (session.value.dirty) {
        return
      }
    }
    emit('updated', (await api.items.archive(item.id, archived)).data)
    await refreshWorkspace(item.workspaceId)
    toast.add({ title: archived ? 'Item archived' : 'Item restored', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to update item', description: errorMessage(cause), color: 'error' })
  } finally {
    lifecycleBusy.value = false
  }
}
async function remove() {
  if (session.value?.dirty) {
    await saveContent()
    if (session.value.dirty) {
      throw new Error('Save or export your draft before deleting this item')
    }
  }
  await removeItem()
}
async function saveTemplate() {
  if (session.value?.dirty) {
    await saveContent()
    if (session.value.dirty) {
      return
    }
  }
  try {
    await api.library.saveTemplate(item.workspaceId, item.id, item.title, item.description)
    toast.add({ title: 'Workspace template saved', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to save template', description: errorMessage(cause), color: 'error' })
  }
}
function exportJson() {
  if (session.value) {
    downloadBlob(new Blob([JSON.stringify(session.value.draft, null, 2)], { type: 'application/json' }), `${item.title}.json`)
  }
}
async function importJson(event: Event) {
  const input = event.target as HTMLInputElement, selected = input.files?.[0]
  input.value = ''
  if (!selected || readonly.value) {
    return
  }
  try {
    if (selected.size > 1000000) {
      throw new Error('Choose a JSON file smaller than 1 MB')
    }
    const value = canvasContentSchema.parse(JSON.parse(await selected.text()))
    if (value.kind !== item.kind) {
      throw new Error(`Choose a ${itemTypeLabels[item.kind]} file`)
    }
    edit(value)
    toast.add({ title: 'File imported into your draft', description: 'Use Undo to return to the previous content.', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to import file', description: errorMessage(cause), color: 'error' })
  }
}
function keyboard(event: KeyboardEvent) {
  if ((event.target as Element).closest('input,textarea,[contenteditable]')) {
    return
  }
  if (!event.metaKey && !event.ctrlKey) {
    return
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveContent()
  }
  if (!readonly.value && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      session.value?.redo()
    } else {
      session.value?.undo()
    }
  }
}
async function discardDraft() {
  if (session.value?.remote) {
    session.value.load(session.value.remote)
  } else {
    await query.refresh()
    if (query.data.value) {
      session.value?.load(query.data.value)
    }
  }
  failed.value = false
}
</script>

<template>
  <div
    :class="isFullscreen ? 'content-fullscreen content-fullscreen-canvas' : 'app-enter pb-ui-5xl'"
    @keydown="keyboard"
  >
    <div v-show="!isFullscreen">
      <ItemHeader
        :item="item"
        :workspace-name="overview.workspace.name"
        :workspace-icon="overview.workspace.icon"
        :folders="overview.folders"
      />
    </div>
    <div class="workspace-content workspace-content-start space-y-ui-2xl canvas-content">
      <ItemMetadata
        v-show="!isFullscreen"
        :item="item"
        :readonly="readonly"
        :on-save="saveMetadata"
      />
      <ItemToolbar
        :item-id="item.id"
        :prepare-resources="prepareResources"
        :resource-readonly="readonly"
        :kind="item.kind"
        :readonly="readonly || !!session?.dirty"
        :comment-count="comments.openCount.value"
        :fullscreen="isFullscreen"
        export-label="Export JSON"
        @comments="comments.open.value = true"
        @fullscreen="toggleFullscreen"
        @export="exportJson"
      >
        <div
          class="editor-toolbar-group"
          role="group"
          aria-label="Edit history"
        >
          <UButton
            v-if="!readonly"
            size="sm"
            icon="i-lucide-undo-2"
            aria-label="Undo"
            color="neutral"
            variant="ghost"
            :disabled="!session?.canUndo"
            @click="session?.undo()"
          /><UButton
            v-if="!readonly"
            size="sm"
            icon="i-lucide-redo-2"
            aria-label="Redo"
            color="neutral"
            variant="ghost"
            :disabled="!session?.canRedo"
            @click="session?.redo()"
          />
        </div>
        <UBadge
          :label="itemTypeLabels[item.kind]"
          variant="soft"
          color="neutral"
        />
        <span
          class="text-xs text-muted"
          aria-live="polite"
        >{{ status }}</span>
        <UButton
          v-if="failed && !readonly"
          size="sm"
          label="Retry save"
          color="neutral"
          variant="ghost"
          @click="saveContent"
        />
        <UButton
          v-if="session?.remote"
          size="sm"
          label="Review changes"
          color="neutral"
          variant="outline"
          @click="reloadOpen = true"
        />
        <span
          class="text-xs text-muted"
          aria-live="polite"
        >{{ presence.connected.value ? 'Live' : 'Reconnecting' }}<template v-if="presence.members.value.length"> · {{ presence.members.value.map(member => `${member.name}${member.selected.length ? ' (editing)' : ''}`).join(', ') }}</template></span>
        <template #more>
          <UDropdownMenu :items="[...(!readonly && item.canManageAccess ? [{ label: 'Save as workspace template', icon: 'i-lucide-layout-template', onSelect: saveTemplate }] : []), ...(!readonly ? [{ label: 'Import JSON', icon: 'i-lucide-upload', onSelect: () => file?.click() }] : []), ...(item.canManageAccess ? [{ label: 'Manage access', icon: 'i-lucide-shield-check', onSelect: () => accessOpen = true }] : []), ...(canLifecycle ? [{ label: item.archivedAt ? 'Restore item' : 'Archive item', icon: 'i-lucide-archive', onSelect: () => lifecycle(!item.archivedAt) }, ...(!item.archivedAt ? [{ label: 'Delete item', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteOpen = true }] : [])] : [])]">
            <UButton
              size="sm"
              icon="i-lucide-ellipsis"
              aria-label="Item actions"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
      </ItemToolbar>
      <div
        v-if="recovered"
        role="status"
        class="rounded-md border border-muted p-ui-lg space-y-ui-md"
      >
        <p class="text-sm font-medium">
          An unsaved draft is available from {{ new Date(recovered.savedAt).toLocaleString() }}.
        </p>
        <p class="text-xs text-muted">
          Restore it to review your work, or discard it and keep the saved version.
        </p>
        <div class="flex gap-ui-sm">
          <UButton
            label="Restore draft"
            @click="restoreDraft"
          />
          <UButton
            label="Discard draft"
            color="neutral"
            variant="ghost"
            @click="discardRecovered"
          />
        </div>
      </div>
      <DataSkeleton
        v-if="!session && query.status.value !== 'error'"
        label="Loading item content"
        kind="editor"
        :rows="6"
      />
      <DataRetry
        v-else-if="!session && query.error.value"
        :on-retry="() => query.refresh()"
        :feedback-keys="[`canvas:${item.id}`]"
      />
      <ClientOnly v-else-if="session">
        <KanbanEditor
          v-if="session.draft.kind === 'kanban'"
          ref="editor"
          :can-comment="canComment"
          :item-id="item.id"
          :prepare-resources="prepareResources"
          :collaborators="presence.members.value"
          :content="session.draft"
          :members="overview.members"
          :readonly="readonly || !!recovered"
          @presence="presence.update"
          @comment="startComment"
          @change="edit"
        />
        <WhiteboardEditor
          v-else-if="session.draft.kind === 'whiteboard'"
          ref="editor"
          :can-comment="canComment"
          :item-id="item.id"
          :prepare-resources="prepareResources"
          :collaborators="presence.members.value"
          :content="session.draft"
          :readonly="readonly || !!recovered"
          @presence="presence.update"
          @comment="startComment"
          @change="edit"
        />
        <DiagramEditor
          v-else
          ref="editor"
          :can-comment="canComment"
          :item-id="item.id"
          :prepare-resources="prepareResources"
          :collaborators="presence.members.value"
          :content="session.draft"
          :readonly="readonly || !!recovered"
          @presence="presence.update"
          @comment="startComment"
          @change="edit"
        />
      </ClientOnly>
      <input
        ref="file"
        type="file"
        accept="application/json,.json"
        class="sr-only"
        aria-label="Import item JSON"
        @change="importJson"
      >
    </div>
    <CommentPanel
      :comments="comments"
      :user-id="auth.user?.id || ''"
      :manager="['owner', 'admin'].includes(overview.workspace.role)"
      :can-comment="canComment"
    />
    <ResourceAccessPanel
      v-if="accessOpen"
      :workspace-id="item.workspaceId"
      kind="item"
      :resource-id="item.id"
      @close="accessOpen = false"
    />
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete item"
      description="This item will move to Trash and can be restored later."
      :on-confirm="remove"
    />
    <ConfirmationDialog
      v-model:open="reloadOpen"
      title="Load the latest version"
      description="Another member saved a newer version. Export your draft first if you want to keep it. Loading the latest version discards your unsaved draft."
      confirm-label="Load latest"
      :on-confirm="discardDraft"
    />
    <UButton
      v-if="session?.remote && !readonly"
      label="Replace saved version with my draft"
      color="neutral"
      variant="ghost"
      class="ms-ui-4xl mt-ui-lg"
      @click="replaceOpen = true"
    />
    <ConfirmationDialog
      v-model:open="replaceOpen"
      title="Replace saved content"
      description="Your draft will replace the latest saved content. The previous saved version remains available in version history."
      confirm-label="Replace content"
      :on-confirm="overwrite"
    />
  </div>
</template>
