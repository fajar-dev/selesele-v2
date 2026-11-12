import { useAuth } from '~/features/auth/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  await auth.service.initialize()
  if (!auth.state.authenticated && to.path !== '/sign-in') {
    return navigateTo('/sign-in')
  }
  if (auth.state.authenticated && to.path === '/sign-in') {
    return navigateTo('/')
  }
})
