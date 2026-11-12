<script setup lang="ts">
import { usePageEditor } from '~/features/pages/composables/usePageEditor'
import PageMetadata from '~/features/pages/components/PageMetadata.vue'
import { usePageActions } from '~/features/pages/composables/usePageActions'
import AppHeader from '~/components/shell/AppHeader.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageToolbar from '~/components/ui/PageToolbar.vue'
import CommentPanel from '~/features/comments/components/CommentPanel.vue'
import EditorCollaborationUsers from '~/features/editor/components/EditorCollaborationUsers.vue'
import EditorLinkPopover from '~/features/editor/components/EditorLinkPopover.vue'
import EditorLoadingState from '~/features/editor/components/EditorLoadingState.vue'
import { useAuth } from '~/features/auth/composables/useAuth'
import { usePageComments } from '~/features/comments/composables/usePageComments'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useFullscreen } from '@vueuse/core'
import type { WorkspaceMember, FolderItem } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'
import { showImageToolbar, showTableToolbar, showTextToolbar } from '~/features/editor/utils/editorSelection'

const props = defineProps<{ page: PageItem, members: WorkspaceMember[], folders: FolderItem[], workspaceName: string }>()
const emit = defineEmits<{ updated: [page: PageItem] }>()
const { state: auth } = useAuth()
const { save: saveMetadata, exporting: isExporting, exportMarkdown, remove: onConfirmDelete } = usePageActions(() => props.page, page => emit('updated', page))
const deleteOpen = ref(false)
const editorRef = useTemplateRef('editorRef')
const comments = usePageComments(props.page.id, editorRef)
const commentOpen = comments.open
const textToolbarItems = computed(() => [[{ label: 'Comment', icon: 'i-lucide-message-square-plus', onClick: () => comments.start() }], ...bubbleToolbarItems.value])
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const {
  collaborationReady, collaborationConnected, collaborationError, connectedUsers, customHandlers,
  extensions, toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems,
  emojiItems, mentionItems, suggestionItems, getDragHandleItems, onNodeChange
} = usePageEditor(props.page.id, () => props.members, editorRef, { annotationExtension: comments.extension, onCommentsChanged: comments.synchronize })
const breadcrumbItems = computed(() => [
  { label: props.workspaceName, icon: 'i-lucide-panels-top-left', to: `/workspaces/${props.page.workspaceId}` },
  ...(props.page.folderId ? [{ label: props.folders.find(folder => folder.id === props.page.folderId)?.name || 'Folder', icon: 'i-lucide-folder', to: `/workspaces/${props.page.workspaceId}?folder=${props.page.folderId}` }] : []),
  { label: `${props.page.icon || '📖'} ${props.page.title}`, to: `/workspaces/${props.page.workspaceId}/pages/${props.page.id}` }
])
const pagesItems: DropdownMenuItem[] = [
  { label: 'Delete', color: 'error' as const, icon: 'i-lucide-trash', onSelect: openDeleteDialog }
]

function openDeleteDialog(): void {
  deleteOpen.value = true
}
</script>

<template>
  <div>
    <UAlert
      v-if="collaborationError"
      title="Collaboration unavailable"
      :description="collaborationError"
      color="warning"
    />
    <EditorLoadingState v-if="!collaborationReady" />
    <UEditor
      v-else
      ref="editorRef"
      v-slot="{ editor, handlers }"
      :model-value="undefined"
      content-type="markdown"
      :mention="false"
      :extensions="extensions"
      :starter-kit="{ undoRedo: false, codeBlock: false }"
      :handlers="customHandlers"
      :autofocus="page.title !== 'Untitled'"
      placeholder="Write something, or type '/' for commands…"
      class="min-h-screen editor-document"
      :ui="{
        base: 'px-0 sm:px-0 py-6 text-base leading-relaxed',
        content: 'workspace-content'
      }"
    >
      <AppHeader>
        <template #right>
          <UTooltip :text="collaborationConnected ? 'Changes sync automatically with your workspace' : 'Trying to restore the live connection'">
            <span
              role="status"
              :aria-label="collaborationConnected ? 'Live sync' : 'Reconnecting…'"
              class="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap"
            >
              <UIcon
                :name="collaborationConnected ? 'i-lucide-cloud-check' : 'i-lucide-loader-circle'"
                :class="['size-3.5', { 'animate-spin': !collaborationConnected }]"
              />
              <span class="hidden sm:inline">{{ collaborationConnected ? 'Live sync' : 'Reconnecting…' }}</span>
            </span>
          </UTooltip>
          <EditorCollaborationUsers
            :users="connectedUsers"
          />
          <ConfirmationDialog
            v-model:open="deleteOpen"
            title="Delete Page"
            description="Are you sure you want to delete this page? This action cannot be undone."
            confirm-label="Delete"
            :on-confirm="onConfirmDelete"
          />
        </template>

        <template #left>
          <PageBreadcrumbs :items="breadcrumbItems" />
        </template>
      </AppHeader>
      <PageContent>
        <PageMetadata
          :page="page"
          :workspace-name="workspaceName"
          :member-count="members.length"
          :on-save="saveMetadata"
        />
        <PageToolbar>
          <template #left>
            <UEditorToolbar
              :editor="editor"
              :items="toolbarItems"
              :ui="{ base: 'gap-1.5', group: 'gap-1', separator: 'h-4 self-center mx-1 bg-(--ui-border-muted)' }"
            />
          </template>

          <template #right>
            <UButton
              :label="comments.openCount.value ? `Comments ${comments.openCount.value}` : 'Comments'"
              aria-label="Open comments"
              icon="i-lucide-message-square"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="commentOpen = !commentOpen"
            />
            <UTooltip text="Export as Markdown">
              <UButton
                aria-label="Export Markdown"
                icon="i-lucide-download"
                color="neutral"
                variant="ghost"
                size="sm"
                class="text-muted hover:text-highlighted"
                :loading="isExporting"
                @click="exportMarkdown"
              />
            </UTooltip>
            <UTooltip :text="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                class="text-muted hover:text-highlighted"
                :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
                :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                @click="toggleFullscreen"
              />
            </UTooltip>
            <UDropdownMenu
              :items="pagesItems"
              size="sm"
              :content="{
                align: 'end',
                side: 'bottom',
                sideOffset: 8
              }"
              :ui="{
                content: 'w-48'
              }"
            >
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-ellipsis"
                aria-label="Page actions"
                class="text-muted hover:text-highlighted"
              />
            </UDropdownMenu>
          </template>
        </PageToolbar>
      </PageContent>
      <UEditorToolbar
        :editor="editor"
        :items="textToolbarItems"
        :options="{ shift: { padding: 8, boundary: editor.view.dom } }"
        :ui="{ root: 'z-40', base: 'flex-wrap max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-20rem)] rounded-[6px]', group: 'flex-wrap' }"
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
        @node-change="onNodeChange"
      >
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="ui.handle()"
          @click="(e: MouseEvent) => {
            e.stopPropagation()
            const node = onClick()

            handlers.suggestion?.execute(editor, { pos: node?.pos }).run()
          }"
        />

        <UDropdownMenu
          v-slot="{ open }"
          :modal="false"
          :items="getDragHandleItems(editor)"
          :content="{ side: 'left' }"
          :ui="{ content: 'w-48', label: 'text-xs' }"
          @update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
        >
          <UButton
            color="neutral"
            variant="ghost"
            active-variant="soft"
            size="sm"
            icon="i-lucide-grip-vertical"
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
    <CommentPanel
      :comments="comments"
      :user-id="auth.user?.id || ''"
      :manager="members.some(member => member.userId === auth.user?.id && member.role !== 'member')"
    />
  </div>
</template>
