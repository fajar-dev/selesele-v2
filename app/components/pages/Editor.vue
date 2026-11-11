<script setup lang="ts">
import type { EditorCustomHandlers, DropdownMenuItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/core'
import { Emoji } from '@tiptap/extension-emoji'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { useFullscreen } from '@vueuse/core'
import { CodeBlockShiki } from 'tiptap-extension-code-block-shiki'
import type { WorkspaceMember, FolderItem } from '#shared/types/workspace'
import type { PageItem } from '#shared/types/page'
import { ImageUpload } from '~/editor/extensions/ImageUploadExtension'
import { CustomMention } from '~/editor/extensions/MentionExtension'
import { pageService } from '~/services/pageService'
import { showImageToolbar, showTableToolbar, showTextToolbar } from '~/utils/editorSelection'

const props = defineProps<{ page: PageItem, members: WorkspaceMember[], folders: FolderItem[], workspaceName: string }>()
const emit = defineEmits<{ updated: [page: PageItem] }>()
const { state: auth } = useAuth()
const toast = useToast()
const editOpen = ref(false)
const deleteOpen = ref(false)
const moveOpen = ref(false)
const isExporting = ref(false)
const editorRef = useTemplateRef('editorRef')
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const profile = computed(() => ({
  name: auth.user?.name || auth.user?.email || 'User',
  color: collaborationColor(auth.user?.email || ''),
  avatar: auth.user?.avatar || undefined
}))
const {
  ready: collaborationReady,
  isConnected: collaborationConnected,
  connectionError: collaborationError,
  connectedUsers,
  extensions: collaborationExtensions,
  updateUser
} = useEditorCollaboration({ room: props.page.id, user: profile.value })

watch(profile, updateUser)

const { extension: completion, handlers: aiHandlers, isLoading: aiLoading } = useEditorCompletion(editorRef)
const customHandlers = {
  imageUpload: {
    canExecute: (editor: Editor) => editor.can().insertImageUpload(),
    execute: (editor: Editor) => editor.chain().focus().insertImageUpload(),
    isActive: (editor: Editor) => editor.isActive('imageUpload')
  },
  table: {
    canExecute: (editor: Editor) => editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
    execute: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
    isActive: (editor: Editor) => editor.isActive('table')
  },
  ...aiHandlers
} satisfies EditorCustomHandlers

const mentionableUsers = computed(() => props.members.map(member => ({
  name: member.name || member.email,
  color: collaborationColor(member.email),
  avatar: member.avatar || undefined
})))
const { items: emojiItems } = useEditorEmojis()
const { items: mentionItems } = useEditorMentions(mentionableUsers)
const { items: suggestionItems } = useEditorSuggestions(customHandlers)
const { getItems: getDragHandleItems, onNodeChange } = useEditorDragHandle(customHandlers)
const { toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems } = useEditorToolbar(customHandlers, { aiLoading })
const extensions = computed(() => [
  CodeBlockShiki.configure({
    defaultTheme: 'material-theme',
    themes: { light: 'material-theme-lighter', dark: 'material-theme-palenight' }
  }),
  completion, CustomMention, Emoji, ImageUpload, TableKit, TaskList, TaskItem,
  ...collaborationExtensions.value
])
const breadcrumbItems = computed(() => [
  { label: props.workspaceName, icon: 'i-lucide-panels-top-left', to: `/workspaces/${props.page.workspaceId}` },
  ...(props.page.folderId ? [{ label: props.folders.find(folder => folder.id === props.page.folderId)?.name || 'Folder', to: `/workspaces/${props.page.workspaceId}?folder=${props.page.folderId}` }] : []),
  { label: `${props.page.icon || '📖'} ${props.page.title}`, to: `/workspaces/${props.page.workspaceId}/pages/${props.page.id}` }
])
const pagesItems: DropdownMenuItem[] = [
  { label: 'Move to folder', icon: 'i-lucide-folder-input', onSelect: () => {
    moveOpen.value = true
  } },
  { label: 'Edit', icon: 'i-lucide-pencil', onSelect: openEditDialog },
  { label: 'Delete', icon: 'i-lucide-trash', onSelect: openDeleteDialog }
]

function openEditDialog(): void {
  editOpen.value = true
}

function openDeleteDialog(): void {
  deleteOpen.value = true
}

async function exportMarkdown(): Promise<void> {
  if (isExporting.value) {
    return
  }
  isExporting.value = true
  try {
    downloadBlob(await pageService.downloadMarkdown(props.page.id), `${props.page.title}.md`)
  } catch (cause) {
    toast.add({ title: 'Unable to export Markdown', description: errorMessage(cause), color: 'error' })
  } finally {
    isExporting.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  await pageService.delete(props.page.id)
  toast.add({ title: 'Page deleted', color: 'success' })
  await refreshWorkspace(props.page.workspaceId)
  await navigateTo(`/workspaces/${props.page.workspaceId}`)
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
      autofocus
      placeholder="Write, type '/' for commands..."
      class="min-h-screen"
      :ui="{
        base: 'p-4 sm:px-14 sm:py-6',
        content: 'max-w-4xl mx-auto'
      }"
    >
      <AppHeader :toolbar="true">
        <template #right>
          <EditorCollaborationUsers
            :users="connectedUsers"
          />
          <PagesFormModal
            v-model:open="editOpen"
            :page="page"
            :workspace-id="page.workspaceId"
            :folders="folders"
            @success="emit('updated', $event)"
          />
          <PagesMoveModal
            v-model:open="moveOpen"
            :page="page"
            :folders="folders"
            @moved="emit('updated', $event)"
          />
          <DeleteConfirmModal
            v-model:open="deleteOpen"
            title="Delete Page"
            description="Are you sure you want to delete this page? This action cannot be undone."
            confirm-label="Delete"
            :on-confirm="onConfirmDelete"
          />
        </template>

        <template #toolbar-left>
          <UBreadcrumb
            class="ms-5"
            size="sm"
            :items="breadcrumbItems"
          />
        </template>

        <template #toolbar-right>
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
          />

          <USeparator
            orientation="vertical"
            class="h-7"
          />

          <UBadge
            variant="subtle"
            :color="collaborationConnected ? 'success' : 'warning'"
          >
            {{ collaborationConnected ? 'Live sync' : 'Reconnecting…' }}
          </UBadge>

          <USeparator
            orientation="vertical"
            class="h-7"
          />
          <UButton
            label="Markdown"
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isExporting"
            @click="exportMarkdown"
          />

          <USeparator
            orientation="vertical"
            class="h-7"
          />

          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-fullscreen'"
            @click="toggleFullscreen"
          />

          <USeparator
            orientation="vertical"
            class="h-7"
          />

          <UDropdownMenu
            :items="pagesItems"
            size="sm"
            :content="{
              align: 'start',
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
              icon="i-lucide-ellipsis-vertical"
              aria-label="Page actions"
            />
          </UDropdownMenu>
        </template>
      </AppHeader>
      <div class="max-w-4xl mx-auto px-4 sm:px-14 pt-12 pb-2">
        <span
          class="text-5xl"
          aria-hidden="true"
        >{{ page.icon || '📄' }}</span>
        <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight mt-5 break-words">
          {{ page.title }}
        </h1>
        <p
          v-if="page.description"
          class="text-muted mt-3"
        >
          {{ page.description }}
        </p>
      </div>

      <UEditorToolbar
        :editor="editor"
        :items="bubbleToolbarItems"
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
  </div>
</template>
