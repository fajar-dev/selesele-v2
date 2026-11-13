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
import type { PageItem } from '#shared/contracts/page'
import { CustomMention } from '~/features/editor/extensions/MentionExtension'
import { ImageUpload } from '~/features/editor/extensions/ImageUploadExtension'
import { useApi } from '~/core/http/useApi'
import { useAuth } from '~/features/auth/composables/useAuth'
import { usePageComments } from '~/features/comments/composables/usePageComments'
import CommentPanel from '~/features/comments/components/CommentPanel.vue'
import AppHeader from '~/components/shell/AppHeader.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import type { Editor } from '@tiptap/core'

const { page, workspaceName, archived = false } = defineProps<{
  page: PageItem
  workspaceName: string
  archived?: boolean
}>()
const { state: auth } = useAuth()
const api = useApi()
const editorRef = useTemplateRef<{
  editor: Editor | undefined
}>('editorRef')
const comments = usePageComments(page.id, editorRef, true, () => {
  void refresh()
})
const commentOpen = comments.open
useNotificationTarget(editorRef, comments)
const { data: workspace } = useWorkspace(page.workspaceId)
const canRestore = computed(() => !!page.archivedAt && !!workspace.value && !workspace.value.workspace.archivedAt && page.accessLevel === 'edit' && allowsWorkspaceAction(workspace.value.workspace.role, workspace.value.workspace.settings, 'deleteContent'))
const restoring = ref(false), toast = useToast()
async function restorePage() {
  if (restoring.value) {
    return
  }
  restoring.value = true
  try {
    await api.pages.archive(page.id, false)
    await refreshWorkspace(page.workspaceId)
    await refreshNuxtData(`pages:${page.id}`)
    toast.add({ title: 'Page restored', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to restore page', description: errorMessage(cause), color: 'error' })
  } finally {
    restoring.value = false
  }
}
const canComment = computed(() => !archived && page.accessLevel === 'comment')
const document = new Y.Doc()
const extensions = [Collaboration.configure({ document }), comments.extension, CustomMention, Emoji, ImageUpload, TableKit, TaskList, TaskItem, CodeBlockShiki.configure({ defaultTheme: 'material-theme', themes: { light: 'material-theme-lighter', dark: 'material-theme-palenight' } })]
const { data: snapshot, status, error, refresh } = useLazyAsyncData(`reader-content:${page.id}`, async () => (await api.pages.state(page.id)).data, { server: false })
watch(snapshot, (state) => {
  if (state) {
    Y.applyUpdate(document, Uint8Array.from(atob(state), char => char.charCodeAt(0)))
  }
}, { immediate: true })
onScopeDispose(() => document.destroy())
useFeedbackToast(error, { key: `reader-content:${page.id}`, title: 'Unable to load content', recovered: () => status.value === 'success', retry: () => refresh() })
useFeedbackToast(() => page.archivedAt ? 'This archived page is read-only. It can be restored from Archived pages.' : !archived ? (canComment.value ? 'You can select text and leave comments. Editing is restricted.' : 'You can read this page. Editing is restricted.') : null, { key: `page-read-only:${page.id}`, title: page.archivedAt ? 'Archived page' : 'Read-only document', color: 'neutral' })
</script>

<template>
  <div>
    <AppHeader>
      <template #left>
        <PageBreadcrumbs :items="[{ label: workspaceName, to: `/workspaces/${page.workspaceId}` }, { label: page.title, emoji: page.icon }]" />
      </template><template #right>
        <UButton
          v-if="canRestore"
          label="Restore page"
          icon="i-lucide-archive-restore"
          color="neutral"
          variant="outline"
          :loading="restoring"
          @click="restorePage"
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
    <PageContent>
      <PageHeading
        :title="`${page.icon || ''} ${page.title}`"
        :description="page.description"
      />
      <DataSkeleton
        v-if="status === 'pending' || status === 'idle'"
        label="Loading document"
        kind="editor"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`reader-content:${page.id}`]"
        :on-retry="() => refresh()"
      />
    </PageContent>
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
