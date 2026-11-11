import type { EditorMentionMenuItem } from '@nuxt/ui'
import type { CollaborationUser } from './useEditorCollaboration'

export function useEditorMentions(users: Ref<CollaborationUser[]>) {
  const items = computed<EditorMentionMenuItem[]>(() => users.value.map(user => ({
    label: user.name,
    avatar: { src: user.avatar, style: { color: user.color } }
  })))

  return { items }
}
