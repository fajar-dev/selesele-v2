<script setup lang="ts">
import SignInScreen from '~/features/authentication/components/SignInScreen.vue'

const title = 'SeleSele — A workspace for your team'
const description = 'Organize documents, tasks, whiteboards, and diagrams in one workspace. Collaborate in real time and find answers across your team’s work.'
const origin = useState('public-site-origin', () => {
  if (import.meta.server && process.env.APP_ORIGIN) {
    try {
      const url = new URL(process.env.APP_ORIGIN)
      return ['https:', 'http:'].includes(url.protocol) ? url.origin : ''
    } catch {
      return ''
    }
  }
  return ''
})
const canonical = origin.value ? new URL('/sign-in', origin.value).href : undefined
const image = origin.value ? new URL('/branding/social-card.png', origin.value).href : undefined
const imageAlt = 'SeleSele — Documents, tasks, whiteboards, and diagrams'

useHead({
  title,
  titleTemplate: '%s',
  link: canonical ? [{ rel: 'canonical', href: canonical }] : []
})
useSeoMeta({
  description,
  ogType: 'website',
  ogSiteName: 'SeleSele',
  ogLocale: 'en_US',
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogImage: image,
  ogImageType: image ? 'image/png' : undefined,
  ogImageWidth: image ? 1200 : undefined,
  ogImageHeight: image ? 630 : undefined,
  ogImageAlt: image ? imageAlt : undefined,
  twitterCard: image ? 'summary_large_image' : 'summary',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  twitterImageAlt: image ? imageAlt : undefined
})
</script>

<template>
  <SignInScreen />
</template>
