import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Emoji } from '@tiptap/extension-emoji'
import { MarkdownManager } from '@tiptap/markdown'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import * as Y from 'yjs'

const extensions = [StarterKit, Image, Mention, TaskList, TaskItem, TableKit, Emoji]
const schema = getSchema(extensions)
const markdown = new MarkdownManager({ extensions })

export function createDocument(content: string, state: Uint8Array | null) {
  if (state) {
    const document = new Y.Doc()
    Y.applyUpdate(document, state)
    return document
  }
  return prosemirrorJSONToYDoc(schema, markdown.parse(content), 'default')
}

export function documentMarkdown(document: Y.Doc) {
  return markdown.serialize(yDocToProsemirrorJSON(document, 'default'))
}
