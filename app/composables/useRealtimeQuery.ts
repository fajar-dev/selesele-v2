import type { AsyncDataOptions, KeysOf } from 'nuxt/app'
import { QueryPresentation } from '~/core/realtime/domain/QueryPresentation'
import { RealtimeQueryCatalog } from '~/core/realtime/domain/RealtimeQueryCatalog'

export function useRealtimeQuery<T, DefaultT = undefined>(key: string, handler: () => Promise<T>, options: AsyncDataOptions<T, T, KeysOf<T>, DefaultT> = {}) {
  const query = useLazyAsyncData<T, unknown, T, KeysOf<T>, DefaultT>(key, handler, options)
  const { $realtime } = useNuxtApp()
  const unregister = $realtime.registry.register(key, new RealtimeQueryCatalog().describe(key), async () => {
    if (query.status.value !== 'idle') {
      await query.refresh()
    }
  })
  watch(query.error, (error) => {
    if (error && [401, 403, 404].includes(Number(error.statusCode))) {
      query.data.value = (options.default ? options.default() : undefined) as typeof query.data.value
    }
  })
  const presentation = reactive(new QueryPresentation())
  watch(query.status, status => presentation.observe(status), { immediate: true, flush: 'sync' })
  const status = computed(() => presentation.status(query.status.value))
  onScopeDispose(unregister)
  return { data: query.data, error: query.error, status, pending: computed(() => status.value === 'pending'), refresh: query.refresh, execute: query.execute, clear: query.clear }
}
