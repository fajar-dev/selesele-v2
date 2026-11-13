import type { Editor } from '@tiptap/core'
import type { usePageComments } from '~/features/comments/composables/usePageComments'
import { useAuth } from '~/features/auth/composables/useAuth'

export function useNotificationTarget(editorRef: Ref<{
  editor: Editor | undefined
} | null | undefined>, comments: ReturnType<typeof usePageComments>) {
  const route = useRoute()
  const { state: auth } = useAuth()
  const toast = useToast()
  let visited = ''
  watch([() => route.query.comment, () => route.query.mention, () => editorRef.value?.editor, comments.threads, comments.loading], () => {
    const editor = editorRef.value?.editor
    const target = typeof route.query.comment === 'string' ? route.query.comment : route.query.mention === '1' ? 'mention' : ''
    if (!target) {
      visited = ''
      return
    }
    if (!editor || editor.isDestroyed || visited === target || comments.loading.value || comments.loadError.value) {
      return
    }
    visited = target
    if (target !== 'mention') {
      const thread = comments.threads.value.find(item => item.id === target)
      if (thread) {
        comments.jump(thread)
      } else {
        toast.add({ title: 'Discussion is no longer available', description: 'It may have been deleted. Other discussions are still available in Comments.', color: 'neutral' })
      }
      return
    }
    let range: {
      from: number
      to: number
    } | null = null
    editor.state.doc.descendants((node, position) => {
      if (!range && node.type.name === 'mention' && node.attrs.id === auth.user?.id) {
        range = { from: position, to: position + node.nodeSize }
      }
    })
    if (range) {
      editor.chain().focus().setTextSelection(range).scrollIntoView().run()
    } else {
      toast.add({ title: 'Mention is no longer in this page', description: 'The document may have changed since the notification was sent.', color: 'neutral' })
    }
  }, { immediate: true, flush: 'post' })
}
