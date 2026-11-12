import Mention from '@tiptap/extension-mention'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MentionComponent from '~/features/editor/components/EditorMention.vue'

export const CustomMention = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null
      },
      label: {
        default: null
      },
      avatar: {
        default: null
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(MentionComponent)
  }
})
