<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import * as Y from 'yjs'
import { useNotificationTarget } from '~/features/notifications/composables/useNotificationTarget'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import Collaboration from '@tiptap/extension-collaboration'
import { Emoji } from '@tiptap/extension-emoji'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { CodeBlockShiki } from 'tiptap-extension-code-block-shiki'
import type { ContentItem } from '#shared/contracts/item'
import { CustomMention } from '~/features/editor/extensions/MentionExtension'
import { ImageUpload } from '~/features/editor/extensions/ImageUploadExtension'
import { useApi } from '~/core/http/useApi'
import { useAuth } from '~/features/auth/composables/useAuth'
import { useItemComments } from '~/features/comments/composables/useItemComments'
import CommentPanel from '~/features/comments/components/CommentPanel.vue'
import AppHeader from '~/components/shell/AppHeader.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'
import ScreenContent from '~/components/ui/ScreenContent.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import type { Editor } from '@tiptap/core'

const { item, workspaceName, archived = false } = defineProps<{
  item: ContentItem
  workspaceName: string
  archived?: boolean
}>()
const { state: auth } = useAuth()
const api = useApi()
const editorRef = useTemplateRef<{
  editor: Editor | undefined
}>('editorRef')
const comments = useItemComments(item.id, editorRef, true, () => {
  void refresh()
})
const commentOpen = comments.open
useNotificationTarget(editorRef, comments)
const { data: workspace } = useWorkspace(item.workspaceId)
const canRestore = computed(() => !!item.archivedAt && !!workspace.value && !workspace.value.workspace.archivedAt && item.accessLevel === 'edit' && allowsWorkspaceAction(workspace.value.workspace.role, workspace.value.workspace.settings, 'deleteContent'))
const restoring = ref(false), toast = useToast()
async function restoreItem() {
  if (restoring.value) {
    return
  }
  restoring.value = true
  try {
    await api.items.archive(item.id, false)
    await refreshWorkspace(item.workspaceId)
    await refreshNuxtData(`items:${item.id}`)
    toast.add({ title: 'Item restored', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to restore item', description: errorMessage(cause), color: 'error' })
  } finally {
    restoring.value = false
  }
}
const canComment = computed(() => !archived && item.accessLevel === 'comment')
const document = new Y.Doc()
const extensions = [Collaboration.configure({ document }), comments.extension, CustomMention, Emoji, ImageUpload, TableKit, TaskList, TaskItem, CodeBlockShiki.configure({ defaultTheme: 'material-theme', themes: { light: 'material-theme-lighter', dark: 'material-theme-palenight' } })]
const { data: snapshot, status, error, refresh } = useLazyAsyncData(`reader-content:${item.id}`, async () => (await api.items.state(item.id)).data, { server: false })
watch(snapshot, (state) => {
  if (state) {
    Y.applyUpdate(document, Uint8Array.from(atob(state), char => char.charCodeAt(0)))
  }
}, { immediate: true })
onScopeDispose(() => document.destroy())
useFeedbackToast(error, { key: `reader-content:${item.id}`, title: 'Unable to load content', recovered: () => status.value === 'success', retry: () => refresh() })
useFeedbackToast(() => item.archivedAt ? 'This archived item is read-only. It can be restored from Archived items.' : !archived ? (canComment.value ? 'You can select text and leave comments. Editing is restricted.' : 'You can read this item. Editing is restricted.') : null, { key: `item-read-only:${item.id}`, title: item.archivedAt ? 'Archived item' : 'Read-only document', color: 'neutral' })
</script>

<template>
  <div>
    <AppHeader>
      <template #left>
        <Breadcrumbs :items="[{ label: workspaceName, to: `/workspaces/${item.workspaceId}` }, { label: item.title, emoji: item.icon }]" />
      </template><template #right>
        <UButton
          v-if="canRestore"
          label="Restore item"
          icon="i-lucide-archive-restore"
          color="neutral"
          variant="outline"
          :loading="restoring"
          @click="restoreItem"
        />
        <UButton
          icon="i-lucide-message-square"
          label="Comments"
          color="neutral"
          variant="ghost"
          @click="commentOpen = !commentOpen"
        />
      </template>
    </AppHeader>
    <ScreenContent>
      <ScreenHeading
        :title="item.title"
        :description="item.description"
      >
        <template #icon>
          <span>{{ item.icon || '📄' }}</span>
        </template>
      </ScreenHeading>
      <DataSkeleton
        v-if="status === 'pending' || status === 'idle'"
        label="Loading document"
        kind="editor"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`reader-content:${item.id}`]"
        :on-retry="() => refresh()"
      />
    </ScreenContent>
    <UEditor
      v-if="status === 'success'"
      ref="editorRef"
      v-slot="{ editor }"
      :model-value="undefined"
      :editable="false"
      :mention="false"
      :extensions="extensions"
      :starter-kit="{ undoRedo: false, codeBlock: false }"
      class="editor-document"
      :ui="{ base: 'px-ui-zero sm:px-ui-zero py-ui-2xl text-base leading-relaxed', content: 'workspace-content' }"
    >
      <UEditorToolbar
        v-if="canComment"
        :editor="editor"
        :items="[[{ label: 'Comment', icon: 'i-lucide-message-square-plus', onClick: () => comments.start() }]]"
        layout="bubble"
        :should-show="({ editor: current }) => !current.state.selection.empty"
      />
    </UEditor>
    <CommentPanel
      :comments="comments"
      :user-id="auth.user?.id || ''"
      :manager="false"
      :can-comment="canComment"
    />
  </div>
</template>
