import type { EditorToolbarItem } from '@nuxt/ui'

/** One block catalogue for slash commands and both conversion menus. */
export function blockTypeItems() {
  return [
    { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
    { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
    { kind: 'heading', level: 4, label: 'Heading 4', icon: 'i-lucide-heading-4' },
    { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
    { kind: 'orderedList', label: 'Numbered List', icon: 'i-lucide-list-ordered' },
    { kind: 'taskList', label: 'Task List', icon: 'i-lucide-list-check' },
    { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: 'Code Block', icon: 'i-lucide-square-code' }
  ] as const satisfies EditorToolbarItem[]
}
