import type { RealtimeScope } from '#shared/model/realtime'

export function useRealtimeEffect(key: string, scope: RealtimeScope, refresh: () => Promise<unknown>) {
  const unregister = useNuxtApp().$realtime.registry.register(key, scope, refresh)
  onScopeDispose(unregister)
}
