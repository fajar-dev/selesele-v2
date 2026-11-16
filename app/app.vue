<script setup lang="ts">
import LibrarySearch from '~/features/library/components/LibrarySearch.vue'
import { useAuth } from '~/features/authentication/composables/useAuth'

const { state: auth } = useAuth()
useHead({
  htmlAttrs: { lang: 'en' },
  titleTemplate: title => title ? `${title} · SeleSele` : 'SeleSele',
  meta: [
    { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#111111', media: '(prefers-color-scheme: dark)' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
    { rel: 'manifest', href: '/manifest.webmanifest' }
  ]
})

const route = useRoute()
const layoutKey = computed(() => String(route.params.workspaceId || 'default'))
const toaster = { position: 'top-right' as const }
const privateTitles: Record<string, string> = {
  tasks: 'My tasks',
  trash: 'Trash',
  members: 'Members',
  ask: 'Ask workspace',
  settings: 'Settings',
  archive: 'Archive',
  templates: 'Templates'
}

useSeoMeta({
  title: () => {
    if (route.path === '/sign-in') {
      return undefined
    }
    if (route.path === '/') {
      return 'Workspaces'
    }
    const parts = route.path.split('/')
    if (parts[1] === 'workspaces') {
      return parts[3] === 'items' ? 'Workspace item' : privateTitles[parts[3] || ''] || 'Workspace'
    }
    return privateTitles[parts[1] || ''] || undefined
  },
  robots: () => route.path === '/sign-in' ? undefined : 'noindex'
})
</script>

<template>
  <UApp :toaster="toaster">
    <LibrarySearch v-if="auth.authenticated" />
    <NuxtLayout :key="layoutKey">
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
