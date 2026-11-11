// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-emoji-picker',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    experimental: {
      componentDetection: true
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'bun',
    experimental: { websocket: true }
  },

  vite: {
    resolve: {
      dedupe: ['vue', 'yjs', '@tiptap/core', '@tiptap/pm', 'prosemirror-model', 'prosemirror-state', 'prosemirror-view', 'prosemirror-transform', 'prosemirror-tables']
    },
    optimizeDeps: {
      include: [
        'yjs', 'y-websocket', '@ai-sdk/vue', 'tiptap-extension-code-block-shiki',
        '@tiptap/core', '@tiptap/vue-3', '@tiptap/vue-3/menus', '@tiptap/y-tiptap',
        '@tiptap/extension-collaboration', '@tiptap/extension-collaboration-caret',
        '@tiptap/extension-emoji', '@tiptap/extension-image', '@tiptap/extension-list',
        '@tiptap/extension-mention', '@tiptap/extension-table', '@tiptap/markdown', '@tiptap/starter-kit',
        '@tiptap/pm/model', '@tiptap/pm/state', '@tiptap/pm/view', '@tiptap/pm/transform', '@tiptap/pm/tables',
        'prosemirror-model', 'prosemirror-state', 'prosemirror-view', 'prosemirror-transform'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SeleSele',
      short_name: 'SeleSele',
      description: 'SeleSele is a Notion alternative with AI-powered completions and real-time collaboration',
      lang: 'en',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#171717',
      icons: [
        {
          src: '/icons/icon_64x64.png',
          sizes: '64x64',
          type: 'image/png'
        },
        {
          src: '/icons/icon_144x144.png',
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: '/icons/icon_192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {

          src: '/icons/icon_384x384.png',
          sizes: '384x384',
          type: 'image/png'
        },
        {
          src: '/icons/icon_512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }
})
