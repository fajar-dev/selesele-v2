import { useCompletion } from '@ai-sdk/vue'
import type { Editor } from '@tiptap/core'
import type { CompletionMode } from '#shared/validation/completion'
import type { CommentAnchor } from '#shared/kernel/comment'
import { Completion } from '~/features/editor/extensions/CompletionExtension'
import { captureTextRange, resolveTextRange } from '~/features/editor/utils/textAnchors'

interface PendingEdit {
  kind: 'ghost' | 'append' | 'replace'
  anchor: CommentAnchor
  original: string
}

export function useEditorCompletion(editorRef: Ref<{ editor: Editor | undefined } | null | undefined>) {
  const pending = shallowRef<PendingEdit>()
  const mode = ref<CompletionMode>('continue')
  const language = ref<string>()
  const toast = useToast()

  function report(cause: unknown) {
    pending.value = undefined
    editorRef.value?.editor?.storage.completion?.clearSuggestion()
    toast.add({ title: 'Unable to complete writing request', description: errorMessage(cause), color: 'error' })
  }

  function spaced(editor: Editor, position: number, text: string) {
    const before = editor.state.doc.textBetween(Math.max(0, position - 1), position)
    return before && !/\s/.test(before) && !/^\s/.test(text) ? ` ${text}` : text
  }

  function finish(text: string) {
    const editor = editorRef.value?.editor
    const edit = pending.value
    if (!editor || editor.isDestroyed || !edit || !text || edit.kind === 'ghost') {
      return
    }
    pending.value = undefined
    const range = resolveTextRange(editor.state, edit.anchor)
    if (!range || (edit.kind === 'replace' && editor.state.doc.textBetween(range.from, range.to, '\n') !== edit.original)) {
      throw new Error('The selected text changed while generating. Select it again to retry.')
    }
    const content = edit.kind === 'append' ? spaced(editor, range.to, text) : text
    editor.chain().focus().insertContentAt(edit.kind === 'replace' ? range : range.to, content, { contentType: 'markdown' }).run()
  }

  const { completion, complete, isLoading, stop, setCompletion } = useCompletion({
    api: '/api/completion', streamProtocol: 'text',
    body: computed(() => ({ mode: mode.value, language: language.value })),
    onFinish: (_prompt, text) => {
      try {
        finish(text)
      } catch (cause) {
        report(cause)
      }
    },
    onError: report
  })

  function cancel() {
    pending.value = undefined
    stop()
    setCompletion('')
  }

  function request(editor: Editor, kind: PendingEdit['kind'], nextMode: CompletionMode, targetLanguage?: string) {
    if (isLoading.value) {
      return
    }
    const { from, to, empty } = editor.state.selection
    if (kind === 'replace' && empty) {
      return
    }
    const position = kind === 'replace' ? from : to
    const anchor = captureTextRange(editor.state, position, kind === 'replace' ? to : position)
    if (!anchor || !editor.markdown) {
      return
    }
    const selected = editor.state.doc.textBetween(from, to, '\n')
    const prompt = kind === 'replace' ? selected : editor.markdown.serialize({ type: 'doc', content: editor.state.doc.slice(0, to).content.toJSON() })
    if (!prompt.trim()) {
      return
    }
    editor.storage.completion.clearSuggestion()
    mode.value = nextMode
    language.value = targetLanguage
    pending.value = { kind, anchor, original: selected }
    if (kind === 'ghost') {
      Object.assign(editor.storage.completion, { position, visible: true })
    }
    void complete(prompt).catch(report)
  }

  watch(completion, (text) => {
    const editor = editorRef.value?.editor
    const edit = pending.value
    if (!editor || editor.isDestroyed || edit?.kind !== 'ghost' || !editor.storage.completion.visible) {
      return
    }
    const range = resolveTextRange(editor.state, edit.anchor)
    if (range) {
      editor.storage.completion.position = range.from
      editor.storage.completion.suggestion = spaced(editor, range.from, text)
      editor.view.dispatch(editor.state.tr.setMeta('completionUpdate', true))
    }
  })

  const extension = Completion.configure({
    onTrigger: editor => request(editor, 'ghost', 'continue'),
    onAccept: cancel,
    onDismiss: cancel
  })

  function transform(nextMode: Exclude<CompletionMode, 'continue'>) {
    return {
      canExecute: (editor: Editor) => !editor.state.selection.empty && !isLoading.value,
      execute: (editor: Editor, command?: { language?: string }) => {
        request(editor, 'replace', nextMode, command?.language)
        return editor.chain()
      },
      isActive: () => !!isLoading.value && mode.value === nextMode,
      isDisabled: (editor: Editor) => editor.state.selection.empty || !!isLoading.value
    }
  }

  const handlers = {
    aiContinue: {
      canExecute: () => !isLoading.value,
      execute: (editor: Editor) => {
        request(editor, 'append', 'continue')
        return editor.chain()
      },
      isActive: () => !!isLoading.value && mode.value === 'continue',
      isDisabled: () => !!isLoading.value
    },
    aiFix: transform('fix'), aiExtend: transform('extend'), aiReduce: transform('reduce'),
    aiSimplify: transform('simplify'), aiSummarize: transform('summarize'), aiTranslate: transform('translate')
  }
  onScopeDispose(cancel)
  return { extension, handlers, isLoading }
}
