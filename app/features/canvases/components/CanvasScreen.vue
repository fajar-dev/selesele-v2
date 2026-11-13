<script setup lang="ts">
import type { ContentItem } from '#shared/contracts/item'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import { itemTypeLabels } from '#shared/kernel/content'
import { canvasContentSchema } from '#shared/validation/canvas'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import AppHeader from '~/components/shell/AppHeader.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import ItemMetadata from '~/features/items/components/ItemMetadata.vue'
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'
import ItemHistory from '~/features/recovery/components/ItemHistory.vue'
import { useItemActions } from '~/features/items/composables/useItemActions'
import { usePersonalLibrary } from '~/features/library/composables/usePersonalLibrary'
import { refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useApi } from '~/core/http/useApi'
import { useCanvas } from '../composables/useCanvas'

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
const { session, query, failed, edit, save: saveContent, overwrite } = useCanvas(item.id, item.workspaceId, () => readonly.value)
const { save: saveMetadata, remove: removeItem } = useItemActions(() => item, current => emit('updated', current))
const personal = usePersonalLibrary()
const favorite = computed(() => personal.data.value.favorites.some(entry => entry.id === item.id))
const canLifecycle = computed(() => item.accessLevel === 'edit' && !overview.workspace.archivedAt && allowsWorkspaceAction(overview.workspace.role, overview.workspace.settings, 'deleteContent'))
const file = useTemplateRef<HTMLInputElement>('file')
const deleteOpen = ref(false), replaceOpen = ref(false), reloadOpen = ref(false), accessOpen = ref(false)
const toast = useToast(), api = useApi(), lifecycleBusy = ref(false)
const status = computed(() => readonly.value ? 'Read-only' : session.value?.saving ? 'Saving…' : session.value?.remote ? 'Review newer version' : failed.value ? 'Retry save' : session.value?.dirty ? 'Unsaved changes' : 'All changes saved')
onMounted(() => {
  void api.library.visit(item.id).catch(() => {
  })
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
    class="app-enter pb-ui-5xl"
    @keydown="keyboard"
  >
    <AppHeader>
      <template #left>
        <Breadcrumbs :items="[{ label: overview.workspace.name, emoji: overview.workspace.icon, to: `/workspaces/${item.workspaceId}` }, ...(item.folderId ? [{ label: overview.folders.find(folder => folder.id === item.folderId)?.name || 'Folder', to: `/workspaces/${item.workspaceId}?folder=${item.folderId}` }] : []), { label: item.title, emoji: item.icon }]" />
      </template>
      <template #right>
        <UButton
          :icon="favorite ? 'i-lucide-star' : 'i-lucide-star'"
          :aria-label="favorite ? 'Remove favorite' : 'Add favorite'"
          :aria-pressed="favorite"
          :variant="favorite ? 'soft' : 'ghost'"
          color="neutral"
          @click="personal.favorite(item.id)"
        />
      </template>
    </AppHeader>
    <div class="workspace-content workspace-content-start space-y-ui-2xl">
      <ItemMetadata
        :item="item"
        :readonly="readonly"
        :on-save="saveMetadata"
      />
      <div class="flex flex-wrap items-center gap-ui-sm border-b border-muted pb-ui-md">
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
          label="Retry save"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="saveContent"
        />
        <UButton
          v-if="session?.remote"
          label="Review changes"
          size="xs"
          color="neutral"
          variant="outline"
          @click="reloadOpen = true"
        />
        <div class="flex items-center gap-ui-xs ms-auto">
          <UButton
            v-if="!readonly"
            icon="i-lucide-undo-2"
            aria-label="Undo"
            color="neutral"
            variant="ghost"
            :disabled="!session?.canUndo"
            @click="session?.undo()"
          /><UButton
            v-if="!readonly"
            icon="i-lucide-redo-2"
            aria-label="Redo"
            color="neutral"
            variant="ghost"
            :disabled="!session?.canRedo"
            @click="session?.redo()"
          />
          <ItemHistory
            :item-id="item.id"
            :kind="item.kind"
            :readonly="readonly || !!session?.dirty"
          />
          <UDropdownMenu :items="[{ label: 'Export JSON', icon: 'i-lucide-download', onSelect: exportJson }, ...(!readonly && item.canManageAccess ? [{ label: 'Save as workspace template', icon: 'i-lucide-layout-template', onSelect: saveTemplate }] : []), ...(!readonly ? [{ label: 'Import JSON', icon: 'i-lucide-upload', onSelect: () => file?.click() }] : []), ...(item.canManageAccess ? [{ label: 'Manage access', icon: 'i-lucide-shield-check', onSelect: () => accessOpen = true }] : []), ...(canLifecycle ? [{ label: item.archivedAt ? 'Restore item' : 'Archive item', icon: 'i-lucide-archive', onSelect: () => lifecycle(!item.archivedAt) }, ...(!item.archivedAt ? [{ label: 'Delete item', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteOpen = true }] : [])] : [])]">
            <UButton
              icon="i-lucide-ellipsis"
              aria-label="Item actions"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
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
          :content="session.draft"
          :members="overview.members"
          :readonly="readonly"
          @change="edit"
        />
        <WhiteboardEditor
          v-else-if="session.draft.kind === 'whiteboard'"
          :content="session.draft"
          :readonly="readonly"
          @change="edit"
        />
        <DiagramEditor
          v-else
          :content="session.draft"
          :readonly="readonly"
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
