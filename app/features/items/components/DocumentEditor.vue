<script setup lang="ts">
import ItemHeader from './ItemHeader.vue'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { allowsWorkspaceAction } from '#shared/model/workspaceSettings'
import { useNotificationTarget } from '~/features/notifications/composables/useNotificationTarget'
import { refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import type { WorkspaceItem, WorkspaceMember, FolderItem } from '#shared/model/workspace'
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'
import ItemToolbar from './ItemToolbar.vue'
import ItemBacklinks from '~/features/library/components/ItemBacklinks.vue'
import { useApi } from '~/core/http/useApi'
import { useDocumentEditor } from '~/features/items/composables/useDocumentEditor'
import ItemMetadata from '~/features/items/components/ItemMetadata.vue'
import { useItemActions } from '~/features/items/composables/useItemActions'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import ScreenContent from '~/components/ui/ScreenContent.vue'
import CommentPanel from '~/features/comments/components/CommentPanel.vue'
import EditorCollaborationUsers from '~/features/editor/components/EditorCollaborationUsers.vue'
import EditorLinkPopover from '~/features/editor/components/EditorLinkPopover.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useAuth } from '~/features/authentication/composables/useAuth'
import { useItemComments } from '~/features/comments/composables/useItemComments'
import type { DropdownMenuItem, EditorDragHandleProps } from '@nuxt/ui'
import { useContentFullscreen } from '~/core/layout/useContentFullscreen'
import type { ContentItem } from '#shared/model/item'
import { showImageToolbar, showTableToolbar, showTextToolbar } from '~/features/editor/utils/editorSelection'

const props = defineProps<{
  item: ContentItem
  members: WorkspaceMember[]
  folders: FolderItem[]
  workspaceName: string
  workspaceIcon?: string
}>()
const emit = defineEmits<{
  updated: [
        item: ContentItem
  ]
}>()
const { state: auth } = useAuth()
const { save: saveMetadata, exporting: isExporting, exportMarkdown, remove: onConfirmDelete } = useItemActions(() => props.item, item => emit('updated', item))
const { library, items: itemApi } = useApi()
const deleteOpen = ref(false)
const accessOpen = ref(false)
const editorRef = useTemplateRef('editorRef')
const comments = useItemComments(props.item.id, editorRef)
useNotificationTarget(editorRef, comments)
const commentOpen = comments.open
const textToolbarItems = computed(() => [[{ label: 'Comment', icon: 'i-lucide-message-square-plus', onClick: () => comments.start() }], ...bubbleToolbarItems.value])
const { isFullscreen, toggle: toggleFullscreen } = useContentFullscreen()
const { collaborationReady, collaborationConnected, collaborationError, connectedUsers, customHandlers, extensions, toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems, emojiItems, mentionItems, suggestionItems, getDragHandleItems, onNodeChange } = useDocumentEditor(props.item.id, () => props.members, editorRef, { annotationExtension: comments.extension })
// Keep the visual gutter inside the handle's hit area so leaving the document
// enters the controls directly instead of crossing a gap that hides them.
const dragHandleOptions: EditorDragHandleProps['options'] = {
  offset: ({ rects }) => ({
    mainAxis: 0,
    alignmentAxis: rects.reference.height > 40 ? 0 : (rects.reference.height - rects.floating.height) / 2
  })
}
const { data: workspace } = useNuxtData<WorkspaceItem>(workspaceKeys.detail(props.item.workspaceId))
const itemsItems = computed<DropdownMenuItem[]>(() => [
  ...(props.item.canManageAccess
    ? [{ label: 'Manage access', icon: 'i-lucide-shield-check', onSelect: () => {
        accessOpen.value = true
      } }]
    : []),
  ...(props.item.canManageAccess ? [{ label: 'Save as workspace template', icon: 'i-lucide-layout-template', onSelect: saveTemplate }] : []),
  ...(workspace.value && allowsWorkspaceAction(workspace.value.role, workspace.value.settings, 'deleteContent') ? [{ label: 'Archive item', icon: 'i-lucide-archive', onSelect: archiveItem }, { label: 'Delete', color: 'error' as const, icon: 'i-lucide-trash', onSelect: openDeleteDialog }] : [])
])
const toast = useToast()
const lifecycleBusy = ref(false)
async function archiveItem() {
  if (lifecycleBusy.value) {
    return
  }
  lifecycleBusy.value = true
  try {
    emit('updated', (await itemApi.archive(props.item.id, true)).data)
    await refreshWorkspace(props.item.workspaceId)
    toast.add({ title: 'Item archived', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to archive item', description: errorMessage(cause), color: 'error' })
  } finally {
    lifecycleBusy.value = false
  }
}
async function saveTemplate() {
  if (lifecycleBusy.value) {
    return
  }
  lifecycleBusy.value = true
  try {
    await library.saveTemplate(props.item.workspaceId, props.item.id, props.item.title.slice(0, 120), props.item.description)
    await refreshNuxtData(`workspace-templates:${props.item.workspaceId}`)
    toast.add({ title: 'Workspace template saved', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to save template', description: errorMessage(cause), color: 'error' })
  } finally {
    lifecycleBusy.value = false
  }
}
function openDeleteDialog(): void {
  deleteOpen.value = true
}
useFeedbackToast(collaborationError, { key: `item-collaboration:${props.item.id}`, title: 'Collaboration unavailable', color: 'warning' })
</script>

<template>
  <div :class="{ 'content-fullscreen content-fullscreen-document': isFullscreen }">
    <div v-show="!isFullscreen">
      <ItemHeader
        :item="item"
        :workspace-name="workspaceName"
        :workspace-icon="workspaceIcon"
        :folders="folders"
      >
        <template #default>
          <UTooltip :text="collaborationConnected ? 'Changes sync automatically with your workspace' : 'Trying to restore the live connection'">
            <span
              role="status"
              :aria-label="collaborationConnected ? 'Live sync' : 'Reconnecting…'"
              class="inline-flex items-center gap-ui-xs text-xs text-muted whitespace-nowrap"
            >
              <UIcon
                :name="collaborationConnected ? 'i-lucide-cloud-check' : 'i-lucide-loader-circle'"
                :class="['size-ui-md', { 'animate-spin': !collaborationConnected }]"
              />
              <span class="hidden sm:inline">{{ collaborationConnected ? 'Live sync' : 'Reconnecting…' }}</span>
            </span>
          </UTooltip>
          <EditorCollaborationUsers
            :users="connectedUsers"
          />
          <ConfirmationDialog
            v-model:open="deleteOpen"
            title="Delete item"
            :description="`“${item.title}” will be moved to Trash. You can restore it later.`"
            confirm-label="Delete"
            :on-confirm="onConfirmDelete"
          />
        </template>
      </ItemHeader>
    </div>
    <ScreenContent v-show="!isFullscreen">
      <ItemMetadata
        :item="item"
        :on-save="saveMetadata"
      />
      <DataSkeleton
        v-if="!collaborationReady"
        kind="editor"
        label="Loading document content"
        :rows="7"
      />
    </ScreenContent>
    <UEditor
      v-if="collaborationReady"
      ref="editorRef"
      v-slot="{ editor, handlers }"
      :model-value="undefined"
      content-type="markdown"
      :mention="false"
      :extensions="extensions"
      :starter-kit="{ undoRedo: false, codeBlock: false }"
      :handlers="customHandlers"
      placeholder="Write something, or type '/' for commands…"
      class="min-h-screen editor-document"
      :ui="{
        base: 'px-ui-zero sm:px-ui-zero py-ui-2xl text-base leading-relaxed',
        content: 'workspace-content'
      }"
    >
      <div class="workspace-content mt-ui-2xl document-toolbar">
        <ItemToolbar
          :item-id="item.id"
          kind="document"
          :comment-count="comments.openCount.value"
          :fullscreen="isFullscreen"
          export-label="Export Markdown"
          :exporting="isExporting"
          @comments="commentOpen = !commentOpen"
          @fullscreen="toggleFullscreen"
          @export="exportMarkdown"
        >
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
            size="sm"
            :ui="{ base: 'gap-ui-xs', group: 'gap-ui-xs', separator: 'h-ui-lg self-center mx-ui-xs bg-(--ui-border-muted)' }"
          />
          <template #related>
            <ItemBacklinks :item-id="item.id" />
          </template>
          <template #more>
            <UDropdownMenu
              v-if="itemsItems.length"
              :items="itemsItems"
              size="sm"
              :content="{
                align: 'end',
                side: 'bottom',
                sideOffset: 8
              }"
              :ui="{
                content: 'w-ui-14xl'
              }"
            >
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-ellipsis"
                aria-label="Item actions"
                class="text-muted hover:text-highlighted"
              />
            </UDropdownMenu>
          </template>
        </ItemToolbar>
      </div>
      <UEditorToolbar
        :editor="editor"
        :items="textToolbarItems"
        :options="{ shift: { padding: 8, boundary: editor.view.dom } }"
        :ui="{ root: 'z-40', base: 'flex-wrap max-w-floating lg:max-w-floating-desktop rounded-md', group: 'flex-wrap' }"
        layout="bubble"
        :should-show="showTextToolbar"
      >
        <template #link>
          <EditorLinkPopover :editor="editor" />
        </template>
      </UEditorToolbar>

      <UEditorToolbar
        :editor="editor"
        :items="getImageToolbarItems(editor)"
        layout="bubble"
        :should-show="showImageToolbar"
      />

      <UEditorToolbar
        :editor="editor"
        :items="getTableToolbarItems(editor)"
        layout="bubble"
        :should-show="showTableToolbar"
      />

      <UEditorDragHandle
        v-slot="{ ui, onClick }"
        :editor="editor"
        :options="dragHandleOptions"
        :ui="{ root: 'pe-ui-sm transition-none' }"
        :on-element-drag-start="() => editor.commands.beginBlockDrag()"
        :on-element-drag-end="() => editor.commands.endBlockDrag()"
        @hover="onNodeChange"
        @node-change="onNodeChange"
      >
        <UButton
          icon="i-lucide-plus"
          aria-label="Add block below"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="ui.handle()"
          @click="(e: MouseEvent) => {
            e.stopPropagation()
            const node = onClick()

            if (node) {
              handlers.suggestion?.execute(editor, { pos: node.pos }).run()
            }
          }"
        />

        <UDropdownMenu
          v-slot="{ open }"
          :modal="false"
          :items="getDragHandleItems(editor)"
          :content="{ side: 'left' }"
          :ui="{ content: 'w-ui-14xl', label: 'text-xs' }"
          @update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
        >
          <UButton
            color="neutral"
            variant="ghost"
            active-variant="soft"
            size="sm"
            icon="i-lucide-grip-vertical"
            aria-label="Block actions"
            :active="open"
            :class="ui.handle()"
          />
        </UDropdownMenu>
      </UEditorDragHandle>

      <UEditorEmojiMenu
        :editor="editor"
        :items="emojiItems"
      />
      <UEditorMentionMenu
        :editor="editor"
        :items="mentionItems"
      />
      <UEditorSuggestionMenu
        :editor="editor"
        :items="suggestionItems"
      />
    </UEditor>
    <ResourceAccessPanel
      v-if="accessOpen"
      :workspace-id="item.workspaceId"
      kind="item"
      :resource-id="item.id"
      @close="accessOpen = false"
    />
    <CommentPanel
      :comments="comments"
      :user-id="auth.user?.id || ''"
      :manager="members.some(member => member.userId === auth.user?.id && ['owner', 'admin'].includes(member.role))"
    />
  </div>
</template>
