import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import type { Editor } from '@tiptap/core'
import type { CommentThreadItem, CommentThreadInput } from '#shared/contracts/comment'
import { CommentSynchronization } from '~/features/comments/synchronization/CommentSynchronization'
import { captureCommentSelection, CommentHighlights, commentHighlightKey, commentRange } from '~/features/comments/editor/CommentHighlights'

export function useItemComments(itemId: string, editorRef: Ref<{
  editor: Editor | undefined
} | null | undefined>, readOnly = false, onContentChanged?: () => void, onObjectJump?: (id: string, type: string) => boolean) {
  const { comments: commentApi } = useApi()
  const threads = ref<CommentThreadItem[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const open = ref(false)
  const activeId = ref<string | null>(null)
  const draft = ref<Omit<CommentThreadInput, 'body'> | null>(null)
  const draftBody = ref('')
  const filter = ref<'open' | 'resolved'>('open')
  const toast = useToast()
  const synchronization = new CommentSynchronization(async () => (await commentApi.list(itemId)).data, (snapshot) => {
    threads.value = snapshot
    loadError.value = ''
    loading.value = false
    if (activeId.value && activeId.value !== 'draft' && !snapshot.some(thread => thread.id === activeId.value)) {
      activeId.value = null
    }
  }, (cause) => {
    loadError.value = errorMessage(cause)
    loading.value = false
  }, (cause) => {
    const status = cause && typeof cause === 'object' && 'statusCode' in cause ? cause.statusCode : undefined
    return status !== 401 && status !== 403 && status !== 404
  })
  const synchronize = () => synchronization.invalidate()
  useFeedbackToast(loadError, { key: `comments:${itemId}`, title: 'Unable to sync comments', retry: synchronize })
  function upsert(thread: CommentThreadItem) {
    const existing = threads.value.some(item => item.id === thread.id)
    threads.value = existing ? threads.value.map(item => item.id === thread.id ? thread : item) : [...threads.value, thread]
    synchronize()
  }
  function select(id: string) {
    const thread = threads.value.find(item => item.id === id)
    if (!thread) {
      return
    }
    filter.value = thread.resolvedAt ? 'resolved' : 'open'
    activeId.value = id
    open.value = true
  }
  function start() {
    const editor = editorRef.value?.editor
    const selection = editor ? captureCommentSelection(editor) : null
    if (!selection) {
      return
    }
    if (selection.quote.length > 10000) {
      toast.add({ title: 'Select a shorter passage', description: 'Comments support selections up to 10,000 characters.', color: 'warning' })
      return
    }
    draftBody.value = ''
    draft.value = selection
    activeId.value = 'draft'
    filter.value = 'open'
    open.value = true
  }
  function startObject(objectId: string, objectType: 'task' | 'element' | 'node' | 'edge', quote: string) {
    draftBody.value = ''
    draft.value = { quote: quote.slice(0, 10000) || objectType, anchor: { kind: 'object', objectType, objectId } }
    activeId.value = 'draft'
    filter.value = 'open'
    open.value = true
  }
  function jump(thread: CommentThreadItem) {
    select(thread.id)
    if ('kind' in thread.anchor) {
      if (!onObjectJump?.(thread.anchor.objectId, thread.anchor.objectType)) {
        toast.add({ title: 'The original object is no longer available', description: 'This discussion is still saved here.', color: 'neutral' })
      }
      return
    }
    const editor = editorRef.value?.editor
    const range = editor ? commentRange(editor.state, thread.anchor) : null
    if (editor && range) {
      editor.chain().focus().setTextSelection(range).scrollIntoView().run()
    } else {
      toast.add({ title: 'The original text is no longer available', description: 'This discussion is still saved here.', color: 'neutral' })
    }
  }
  async function create(body: string) {
    if (!draft.value) {
      return
    }
    const { data } = await commentApi.create(itemId, { ...draft.value, body })
    upsert(data)
    draft.value = null
    activeId.value = data.id
  }
  async function reply(id: string, body: string) {
    upsert((await commentApi.reply(itemId, id, body)).data)
  }
  async function resolve(id: string, resolved: boolean) {
    upsert((await commentApi.resolve(itemId, id, resolved)).data)
    activeId.value = null
  }
  async function remove(id: string) {
    await commentApi.delete(itemId, id)
    threads.value = threads.value.filter(thread => thread.id !== id)
    synchronize()
    if (activeId.value === id) {
      activeId.value = null
    }
  }
  const extension = CommentHighlights.configure({
    annotations: () => [
      ...threads.value.filter(thread => !thread.resolvedAt || thread.id === activeId.value).map(({ id, anchor }) => ({ id, anchor })),
      ...(draft.value ? [{ id: 'draft', anchor: draft.value.anchor }] : [])
    ],
    activeId: () => activeId.value,
    onSelect: select,
    onCreate: start
  })
  watch([threads, draft, activeId], () => {
    const editor = editorRef.value?.editor
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta(commentHighlightKey, 'refresh').setMeta('addToHistory', false))
    }
  }, { flush: 'post' })
  watch(open, (value) => {
    if (!value) {
      activeId.value = null
    }
  })
  let events: EventSource | undefined
  onMounted(() => {
    synchronize()
    if (readOnly) {
      events = new EventSource(`/api/items/${itemId}/comments/events`)
      events.onerror = () => {
        void refreshNuxtData(`items:${itemId}`)
      }
      events.onmessage = () => {
        synchronize()
        onContentChanged?.()
      }
    }
  })
  onScopeDispose(() => events?.close())
  onScopeDispose(() => synchronization.dispose())
  const openCount = computed(() => threads.value.filter(thread => !thread.resolvedAt).length)
  return { itemId, threads, openCount, loading, loadError, open, activeId, draft, draftBody, filter, extension, synchronize, start, startObject, select, jump, create, reply, resolve, remove }
}
