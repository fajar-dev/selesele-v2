import { SerialTaskQueue } from '~/core/async/SerialTaskQueue'
import type { PageItem, PageUpdate } from '#shared/contracts/page'
import { useApi } from '~/core/http/useApi'
import { usePageDeletion } from './usePageDeletion'

export function usePageActions(page: () => PageItem, onUpdated: (page: PageItem) => void) {
  const { pages } = useApi()
  const { deletePage } = usePageDeletion(page().workspaceId)
  const toast = useToast()
  const exporting = ref(false)
  const writes = new SerialTaskQueue()

  function save(input: PageUpdate): Promise<void> {
    return writes.run(async () => {
      onUpdated((await pages.update(page().id, input)).data)
    })
  }

  async function exportMarkdown() {
    if (exporting.value) {
      return
    }
    exporting.value = true
    try {
      downloadBlob(await pages.downloadMarkdown(page().id), `${page().title}.md`)
    } catch (cause) {
      toast.add({ title: 'Unable to export Markdown', description: errorMessage(cause), color: 'error' })
    } finally {
      exporting.value = false
    }
  }

  async function remove() {
    await deletePage(page().id)
    toast.add({ title: 'Page deleted', color: 'success' })
  }
  return { save, exporting, exportMarkdown, remove }
}
