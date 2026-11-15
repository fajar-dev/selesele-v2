import { RealtimeQueryRegistry } from '~/core/realtime/application/RealtimeQueryRegistry'
import { BrowserRealtimeConnection } from '~/core/realtime/infrastructure/BrowserRealtimeConnection'
import { useAuth } from '~/features/authentication/composables/useAuth'

export default defineNuxtPlugin({
  name: 'realtime', dependsOn: ['api'],
  setup(application) {
    const registry = new RealtimeQueryRegistry(), connected = ref(false)
    if (import.meta.client) {
      const { state: authentication, service } = useAuth()
      const connection = new BrowserRealtimeConnection(registry, (value) => {
        connected.value = value
      }, () => {
        void service.revalidate()
      })
      application.hook('app:mounted', () => {
        watch(() => authentication.user?.id, (id) => {
          connection.stop()
          if (id) {
            connection.start()
          }
        }, { immediate: true })
      })
      const resume = () => {
        if (authentication.authenticated && document.visibilityState === 'visible') {
          connection.resume()
          void service.revalidate()
        }
      }
      window.addEventListener('online', resume)
      document.addEventListener('visibilitychange', resume)
      if (import.meta.hot) {
        import.meta.hot.dispose(() => {
          connection.stop()
          registry.dispose()
          window.removeEventListener('online', resume)
          document.removeEventListener('visibilitychange', resume)
        })
      }
    }
    return { provide: { realtime: { registry, connected } } }
  }
})
