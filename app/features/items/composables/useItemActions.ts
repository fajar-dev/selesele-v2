import { SerialTaskQueue } from '~/core/async/SerialTaskQueue'
import type { ContentItem, ItemUpdate } from '#shared/contracts/item'
import { useApi } from '~/core/http/useApi'
import { useItemDeletion } from './useItemDeletion'

export function useItemActions(item: () => ContentItem, onUpdated: (item: ContentItem) => void) {
  const { items } = useApi()
  const { deleteItem } = useItemDeletion(item().workspaceId)
  const toast = useToast()
  const exporting = ref(false)
  const writes = new SerialTaskQueue()
  function save(input: ItemUpdate): Promise<void> {
    return writes.run(async () => {
      onUpdated((await items.update(item().id, input)).data)
    })
  }
  async function exportMarkdown() {
    if (exporting.value) {
      return
    }
    exporting.value = true
    try {
      downloadBlob(await items.downloadMarkdown(item().id), `${item().title}.md`)
    } catch (cause) {
      toast.add({ title: 'Unable to export Markdown', description: errorMessage(cause), color: 'error' })
    } finally {
      exporting.value = false
    }
  }
  async function remove() {
    await deleteItem(item().id)
    toast.add({ title: 'Item deleted', color: 'success' })
  }
  return { save, exporting, exportMarkdown, remove }
}
