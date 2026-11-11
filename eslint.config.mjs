// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'curly': ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }]
    }
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    files: ['**/*.vue'],
    rules: { 'vue/block-order': ['error', { order: ['script', 'template', 'style'] }] }
  },
  {
    files: ['server/domain/**/*.ts', 'server/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/infrastructure/**', '**/http/**', 'nuxt', 'nuxt/**', '@nuxt/**', 'h3', 'drizzle-orm', 'drizzle-orm/**'],
          message: 'Domain and application code must depend on domain ports, not HTTP or infrastructure adapters.'
        }]
      }]
    }
  },
  {
    files: ['app/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/server/**', '@nuxt/nitro-server/**', 'nuxt/server', 'drizzle-orm', 'drizzle-orm/**', 'mysql2', 'mysql2/**'],
          message: 'Browser code accesses the server through API clients and shared contracts.'
        }]
      }]
    }
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/app/**', '**/server/**', 'nuxt', 'nuxt/**', '@nuxt/**', 'vue', '@tiptap/**', 'node:*'],
          message: 'Shared contracts and validation must stay independent of application and runtime layers.'
        }]
      }]
    }
  }

)
