import type { EditorMentionMenuItem } from '@nuxt/ui'
import type { CollaborationUser } from '~/features/editor/composables/useEditorCollaboration'

export function useEditorMentions(users: Ref<CollaborationUser[]>) {
  const items = computed<EditorMentionMenuItem[]>(() => users.value.map(user => ({
    label: user.name,
    avatar: { src: user.avatar, style: { color: user.color } }
  })))

  return { items }
}
