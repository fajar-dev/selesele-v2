import { libraryKeys } from '~/features/library/state/libraryKeys'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'

export function usePersonalLibrary() {
  const { library } = useApi()
  const query = useLazyAsyncData(libraryKeys.personal, async () => (await library.personal()).data, { server: false, default: () => ({ favorites: [], recent: [] }) })
  useFeedbackToast(query.error, { key: libraryKeys.personal, title: 'Unable to load your items', recovered: () => query.status.value === 'success', retry: () => query.refresh() })
  const busy = ref(false)
  const toast = useToast()
  async function favorite(itemId: string) {
    if (busy.value) {
      return
    }
    busy.value = true
    try {
      await library.favorite(itemId, !query.data.value.favorites.some(item => item.id === itemId))
      await query.refresh()
    } catch (cause) {
      toast.add({ title: 'Unable to update favorite', description: errorMessage(cause), color: 'error' })
    } finally {
      busy.value = false
    }
  }
  return { ...query, favorite, busy }
}
