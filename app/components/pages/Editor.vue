<script setup lang="ts">
import type { EditorCustomHandlers, DropdownMenuItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/core'
import { Emoji } from '@tiptap/extension-emoji'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { useFullscreen } from '@vueuse/core'
import { CodeBlockShiki } from 'tiptap-extension-code-block-shiki'
import type { WorkspaceMember, FolderItem } from '#shared/types/workspace'
import type { PageItem, PageUpdate } from '#shared/types/page'
import { ImageUpload } from '~/editor/extensions/ImageUploadExtension'
import { CustomMention } from '~/editor/extensions/MentionExtension'
import { pageService } from '~/services/pageService'
import { showImageToolbar, showTableToolbar, showTextToolbar } from '~/utils/editorSelection'

const props = defineProps<{ page: PageItem, members: WorkspaceMember[], folders: FolderItem[], workspaceName: string }>()
const emit = defineEmits<{ updated: [page: PageItem] }>()
const { state: auth } = useAuth()
const toast = useToast()
const titleInput = useTemplateRef('titleInput')
const iconOpen = ref(false)
const iconSaving = ref(false)
const colorMode = useColorMode()
let metadataQueue: Promise<void> = Promise.resolve()
function saveMetadata(input: PageUpdate): Promise<void> {
  const next = metadataQueue.catch(() => {}).then(async () => {
    const response = await pageService.update(props.page.id, input)
    emit('updated', response.data)
  })
  metadataQueue = next
  return next
}
async function selectIcon(emoji: { i: string }) {
  if (iconSaving.value) {
    return
  }
  iconSaving.value = true
  try {
    await saveMetadata({ icon: emoji.i })
    iconOpen.value = false
  } catch (cause) {
    toast.add({ title: 'Unable to update page icon', description: errorMessage(cause), color: 'error' })
  } finally {
    iconSaving.value = false
  }
}
const deleteOpen = ref(false)
const isExporting = ref(false)
const editorRef = useTemplateRef('editorRef')
const comments = usePageComments(props.page.id, editorRef)
const commentOpen = comments.open
const textToolbarItems = computed(() => [[{ label: 'Comment', icon: 'i-lucide-message-square-plus', onClick: () => comments.start() }], ...bubbleToolbarItems.value])
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
} = useEditorCollaboration({ room: props.page.id, user: profile.value, onCommentsChanged: comments.synchronize })

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
  comments.extension, completion, CustomMention, Emoji, ImageUpload, TableKit, TaskList, TaskItem,
  ...collaborationExtensions.value
])
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
          <DeleteConfirmModal
            v-model:open="deleteOpen"
            title="Delete Page"
            description="Are you sure you want to delete this page? This action cannot be undone."
            confirm-label="Delete"
            :on-confirm="onConfirmDelete"
          />
        </template>

        <template #left>
          <WorkspacesBreadcrumbs :items="breadcrumbItems" />
        </template>
      </AppHeader>
      <WorkspacesContent>
        <WorkspacesHeading
          :title="page.title"
        >
          <template #icon>
            <UPopover
              v-model:open="iconOpen"
              :content="{ align: 'start' }"
            >
              <UButton
                :label="iconSaving ? undefined : page.icon || '📄'"
                aria-label="Choose page icon"
                color="neutral"
                variant="ghost"
                :loading="iconSaving"
                class="size-10 p-0 justify-center text-[2rem] leading-none"
              />
              <template #content>
                <NuxtEmojiPicker
                  :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
                  @select="selectIcon"
                />
              </template>
            </UPopover>
          </template>
          <template #title>
            <InlineName
              ref="titleInput"
              :value="page.title"
              label="Page title"
              fallback="Untitled"
              :autofocus="page.title === 'Untitled'"
              :on-save="title => saveMetadata({ title })"
            />
          </template>
          <template #metadata>
            <UIcon
              name="i-lucide-users"
              class="size-3.5"
            />
            <span>Shared with {{ workspaceName }}</span>
            <span class="text-dimmed">·</span>
            <span>{{ members.length }} {{ members.length === 1 ? 'member' : 'members' }}</span>
          </template>
        </WorkspacesHeading>
        <WorkspacesContentToolbar>
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
        </WorkspacesContentToolbar>
      </WorkspacesContent>
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
    <CommentsPanel
      :comments="comments"
      :user-id="auth.user?.id || ''"
      :manager="members.some(member => member.userId === auth.user?.id && member.role !== 'member')"
    />
  </div>
</template>
