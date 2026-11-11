<script setup lang="ts">
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'manifest', href: '/manifest.webmanifest' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const route = useRoute()
const layoutKey = computed(() => String(route.params.workspaceId || 'default'))
const title = 'SeleSele'
const description = 'SeleSele is a Notion alternative with AI-powered completions and real-time collaboration'
const toaster = { position: 'top-right' as const }

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp :toaster="toaster">
    <NuxtLayout :key="layoutKey">
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
