import type { EditorCustomHandlers } from '@nuxt/ui'
import type { Editor, Extension } from '@tiptap/core'
import { Emoji } from '@tiptap/extension-emoji'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { CodeBlockShiki } from 'tiptap-extension-code-block-shiki'
import type { WorkspaceMember } from '#shared/contracts/workspace'
import { useAuth } from '~/features/auth/composables/useAuth'
import { useEditorCollaboration } from '~/features/editor/composables/useEditorCollaboration'
import { useEditorCompletion } from '~/features/editor/composables/useEditorCompletion'
import { useEditorToolbar } from '~/features/editor/composables/useEditorToolbar'
import { useEditorSuggestions } from '~/features/editor/composables/useEditorSuggestions'
import { useEditorDragHandle } from '~/features/editor/composables/useEditorDragHandle'
import { useEditorMentions } from '~/features/editor/composables/useEditorMentions'
import { useEditorEmojis } from '~/features/editor/composables/useEditorEmojis'
import { collaborationColor } from '~/features/editor/utils/collaborationIdentity'
import { ImageUpload } from '~/features/editor/extensions/ImageUploadExtension'
import { CustomMention } from '~/features/editor/extensions/MentionExtension'
import { BlockDragDrop } from '~/features/editor/extensions/BlockDragDropExtension'

interface PageEditorOptions {
  annotationExtension: Extension
  onCommentsChanged: () => void
}

export function usePageEditor(room: string, members: () => WorkspaceMember[], editorRef: Ref<{ editor: Editor | undefined } | null | undefined>, options: PageEditorOptions) {
  const { state: auth } = useAuth()
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
  } = useEditorCollaboration({ room: room, user: profile.value, onCommentsChanged: options.onCommentsChanged })

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

  const mentionableUsers = computed(() => members().filter((member): member is WorkspaceMember & { userId: string } => !!member.userId && !member.suspendedAt).map(member => ({
    id: member.userId,
    name: member.name || member.email,
    color: collaborationColor(member.email),
    avatar: member.avatar || undefined
  })))
  const { items: emojiItems } = useEditorEmojis()
  const { items: mentionItems } = useEditorMentions(mentionableUsers)
  const { items: suggestionItems } = useEditorSuggestions<typeof customHandlers>()
  const { getItems: getDragHandleItems, onNodeChange } = useEditorDragHandle(customHandlers)
  const { toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems } = useEditorToolbar<typeof customHandlers>({ aiLoading })
  const extensions = computed(() => [
    CodeBlockShiki.configure({
      defaultTheme: 'material-theme',
      themes: { light: 'material-theme-lighter', dark: 'material-theme-palenight' }
    }),
    options.annotationExtension, completion, CustomMention, Emoji, ImageUpload.configure({ pageId: room }), TableKit, TaskList, TaskItem, BlockDragDrop,
    ...collaborationExtensions.value
  ])

  return {
    collaborationReady, collaborationConnected, collaborationError, connectedUsers, customHandlers,
    extensions, toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems,
    emojiItems, mentionItems, suggestionItems, getDragHandleItems, onNodeChange
  }
}
