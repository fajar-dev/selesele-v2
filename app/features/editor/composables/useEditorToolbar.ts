import { blockTypeItems } from '../utils/blockTypeItems'
import type { EditorToolbarItem, EditorCustomHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'

function selectedImageRange(editor: Editor) {
  const from = editor.state.selection.from
  const node = editor.state.doc.nodeAt(from)
  return node?.type.name === 'image' ? { from, to: from + node.nodeSize } : null
}

interface UseEditorToolbarOptions {
  aiLoading?: Ref<boolean | undefined>
}

export function useEditorToolbar<T extends EditorCustomHandlers>(options: UseEditorToolbarOptions = {}) {
  const { aiLoading } = options

  const toolbarItems: EditorToolbarItem<T>[][] = [[{
    kind: 'undo',
    icon: 'i-lucide-undo',
    tooltip: { text: 'Undo' }
  }, {
    kind: 'redo',
    icon: 'i-lucide-redo',
    tooltip: { text: 'Redo' }
  }], [{
    kind: 'imageUpload',
    label: 'Image',
    icon: 'i-lucide-image',
    tooltip: { text: 'Add image' }
  }]]

  const bubbleToolbarItems = computed(() => [[{
    icon: 'i-lucide-sparkles',
    label: 'Improve',
    activeColor: 'neutral',
    activeVariant: 'ghost',
    loading: aiLoading?.value,
    content: {
      align: 'start'
    },
    items: [{
      kind: 'aiFix',
      label: 'Fix spelling & grammar',
      icon: 'i-lucide-spell-check'
    }, {
      kind: 'aiExtend',
      label: 'Extend text',
      icon: 'i-lucide-unfold-vertical'
    }, {
      kind: 'aiReduce',
      label: 'Reduce text',
      icon: 'i-lucide-fold-vertical'
    }, {
      kind: 'aiSimplify',
      label: 'Simplify text',
      icon: 'i-lucide-lightbulb'
    }, {
      kind: 'aiContinue',
      label: 'Continue sentence',
      icon: 'i-lucide-text'
    }, {
      kind: 'aiSummarize',
      label: 'Summarize',
      icon: 'i-lucide-list'
    }, {
      label: 'Translate',
      icon: 'i-lucide-languages',
      children: [{
        kind: 'aiTranslate',
        language: 'English',
        label: 'English'
      }, {
        kind: 'aiTranslate',
        language: 'French',
        label: 'French'
      }, {
        kind: 'aiTranslate',
        language: 'Spanish',
        label: 'Spanish'
      }, {
        kind: 'aiTranslate',
        language: 'German',
        label: 'German'
      }, {
        kind: 'aiTranslate',
        language: 'Italian',
        label: 'Italian'
      }, {
        kind: 'aiTranslate',
        language: 'Portuguese',
        label: 'Portuguese'
      }, {
        kind: 'aiTranslate',
        language: 'Russian',
        label: 'Russian'
      }, {
        kind: 'aiTranslate',
        language: 'Chinese',
        label: 'Chinese'
      }, {
        kind: 'aiTranslate',
        language: 'Japanese',
        label: 'Japanese'
      }, {
        kind: 'aiTranslate',
        language: 'Korean',
        label: 'Korean'
      }, {
        kind: 'aiTranslate',
        language: 'Arabic',
        label: 'Arabic'
      }, {
        kind: 'aiTranslate',
        language: 'Hindi',
        label: 'Hindi'
      }, {
        kind: 'aiTranslate',
        language: 'Urdu',
        label: 'Urdu'
      }, {
        kind: 'aiTranslate',
        language: 'Vietnamese',
        label: 'Vietnamese'
      }, {
        kind: 'aiTranslate',
        language: 'Thai',
        label: 'Thai'
      }, {
        kind: 'aiTranslate',
        language: 'Indonesian',
        label: 'Indonesian'
      }
      ]
    }]
  }], [{
    label: 'Turn into',
    trailingIcon: 'i-lucide-chevron-down',
    activeColor: 'neutral',
    activeVariant: 'ghost',
    tooltip: { text: 'Turn into' },
    content: {
      align: 'start'
    },
    ui: {
      label: 'text-xs'
    },
    items: [{
      type: 'label',
      label: 'Turn into'
    }, ...blockTypeItems()]
  }], [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-lucide-bold',
    tooltip: { text: 'Bold' }
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-lucide-italic',
    tooltip: { text: 'Italic' }
  }, {
    kind: 'mark',
    mark: 'underline',
    icon: 'i-lucide-underline',
    tooltip: { text: 'Underline' }
  }, {
    kind: 'mark',
    mark: 'strike',
    icon: 'i-lucide-strikethrough',
    tooltip: { text: 'Strikethrough' }
  },
  {
    kind: 'mark',
    mark: 'code',
    icon: 'i-lucide-code',
    tooltip: { text: 'Code' }
  }, {
    slot: 'link' as const,
    icon: 'i-lucide-link'
  }, {
    kind: 'imageUpload',
    icon: 'i-lucide-image',
    tooltip: { text: 'Image' }
  }]] satisfies EditorToolbarItem<T>[][])

  const getImageToolbarItems = (editor: Editor): EditorToolbarItem<T>[][] => {
    const node = editor.state.doc.nodeAt(editor.state.selection.from)

    return [[{
      icon: 'i-lucide-download',
      to: node?.attrs?.src,
      download: true,
      tooltip: { text: 'Download' }
    }, {
      icon: 'i-lucide-refresh-cw',
      tooltip: { text: 'Replace' },
      onClick: () => {
        const range = selectedImageRange(editor)
        if (range) {
          editor.chain().focus().deleteRange(range).insertContentAt(range.from, { type: 'imageUpload' }).run()
        }
      }
    }], [{
      icon: 'i-lucide-trash',
      tooltip: { text: 'Delete' },
      color: 'error',
      onClick: () => {
        const range = selectedImageRange(editor)
        if (range) {
          editor.chain().focus().deleteRange(range).run()
        }
      }
    }]]
  }

  const getTableToolbarItems = (editor: Editor): EditorToolbarItem<T>[][] => {
    return [[{
      icon: 'i-lucide-between-vertical-start',
      tooltip: { text: 'Add row above' },
      onClick: () => {
        editor.chain().focus().addRowBefore().run()
      }
    }, {
      icon: 'i-lucide-between-vertical-end',
      tooltip: { text: 'Add row below' },
      onClick: () => {
        editor.chain().focus().addRowAfter().run()
      }
    }, {
      icon: 'i-lucide-between-horizontal-start',
      tooltip: { text: 'Add column before' },
      onClick: () => {
        editor.chain().focus().addColumnBefore().run()
      }
    }, {
      icon: 'i-lucide-between-horizontal-end',
      tooltip: { text: 'Add column after' },
      onClick: () => {
        editor.chain().focus().addColumnAfter().run()
      }
    }], [{
      icon: 'i-lucide-rows-3',
      tooltip: { text: 'Delete row' },
      color: 'error',
      onClick: () => {
        editor.chain().focus().deleteRow().run()
      }
    }, {
      icon: 'i-lucide-columns-3',
      tooltip: { text: 'Delete column' },
      color: 'error',
      onClick: () => {
        editor.chain().focus().deleteColumn().run()
      }
    }], [{
      icon: 'i-lucide-trash',
      tooltip: { text: 'Delete table' },
      color: 'error',
      onClick: () => {
        editor.chain().focus().deleteTable().run()
      }
    }]]
  }

  return {
    toolbarItems,
    bubbleToolbarItems,
    getImageToolbarItems,
    getTableToolbarItems
  }
}
