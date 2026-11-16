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

  routeRules: {
    '/': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/workspaces': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/workspaces/**': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/tasks': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/trash': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/images/**': { headers: { 'X-Robots-Tag': 'noindex' } },
    '/collaboration/**': { headers: { 'X-Robots-Tag': 'noindex' } }
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
        '@vue-flow/core', '@vue-flow/background', '@vue-flow/controls',
        '@vue-flow/minimap', '@vue-flow/node-resizer', 'perfect-freehand', 'zod', 'micromark',
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
    // Serve the same manifest in development and production without a dev worker.
    manifest: false,
    workbox: { navigateFallback: null }
  }
})
