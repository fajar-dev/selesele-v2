import { libraryKeys } from '~/features/library/state/libraryKeys'
import { useApi } from '~/core/http/useApi'

export function usePersonalLibrary() {
  const { library } = useApi()
  const query = useLazyAsyncData(libraryKeys.personal, async () => (await library.personal()).data, { server: false, default: () => ({ favorites: [], recent: [] }) })
  const busy = ref(false)
  const toast = useToast()
  async function favorite(pageId: string) {
    if (busy.value) {
      return
    }
    busy.value = true
    try {
      await library.favorite(pageId, !query.data.value.favorites.some(page => page.id === pageId))
      await query.refresh()
    } catch (cause) {
      toast.add({ title: 'Unable to update favorite', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = false
    }
  }
  return { ...query, favorite, busy }
}
