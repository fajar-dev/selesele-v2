import { blockTypeItems } from '../utils/blockTypeItems'
import type { EditorSuggestionMenuItem, EditorCustomHandlers } from '@nuxt/ui'

export function useEditorSuggestions<T extends EditorCustomHandlers>() {
  const items = [[{
    type: 'label',
    label: 'AI'
  }, {
    kind: 'aiContinue',
    label: 'Continue writing',
    icon: 'i-lucide-sparkles'
  }], [{
    type: 'label',
    label: 'Style'
  }, ...blockTypeItems(), {
    kind: 'horizontalRule',
    label: 'Divider',
    icon: 'i-lucide-separator-horizontal'
  }], [{
    type: 'label',
    label: 'Insert'
  }, {
    kind: 'mention',
    label: 'Mention',
    icon: 'i-lucide-at-sign'
  }, {
    kind: 'emoji',
    label: 'Emoji',
    icon: 'i-lucide-smile-plus'
  }, {
    kind: 'imageUpload',
    label: 'Image',
    icon: 'i-lucide-image'
  }, {
    kind: 'table',
    label: 'Table',
    icon: 'i-lucide-table'
  }]] satisfies EditorSuggestionMenuItem<T>[][]

  return {
    items
  }
}
