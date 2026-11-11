import { authService } from '~/services/authService'
import type { User } from '#shared/types/auth'

export function useAuth() {
  // useState is isolated per SSR request, unlike module-level refs.
  const user = useState<User | null>('auth:user', () => null)
  const initialized = useState('auth:initialized', () => false)

  async function initialize() {
    if (initialized.value) {
      return
    }
    try {
      user.value = (await authService.me()).data
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status !== 401) {
        throw error
      }
      user.value = null
    }
    initialized.value = true
  }

  return {
    state: reactive({ user, initialized, authenticated: computed(() => !!user.value) }),
    service: {
      initialize,
      async logout() {
        try {
          await authService.logout()
        } catch (error) {
          if ((error as { statusCode?: number }).statusCode !== 401) {
            throw error
          }
        }
        user.value = null
        initialized.value = true
        await navigateTo('/sign-in')
      }
    }
  }
}
