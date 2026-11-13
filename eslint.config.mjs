// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

const frameworkAndDatabase = ['nuxt', 'nuxt/**', '@nuxt/**', 'h3', 'drizzle-orm', 'drizzle-orm/**', 'mysql2', 'mysql2/**', 'vue']
const restricted = (group, message) => ['error', { patterns: [{ group, message }] }]

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
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': ['error', { selector: 'ImportDeclaration[source.value="zod"] > ImportSpecifier[imported.name="z"]', message: 'Use a namespace import for Zod so schemas work consistently in Bun development SSR.' }]
    }
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/no-restricted-syntax': ['error', {
        selector: 'VElement[rawName="UAlert"], VElement[rawName="u-alert"]',
        message: 'Use toast feedback for notifications and DataRetry for failed queries.'
      }, {
        selector: 'VAttribute[key.name="role"][value.value="alert"]',
        message: 'Announce notifications through the shared toast system.'
      }]
    }
  },
  {
    files: ['server/features/**/domain/**/*.ts', 'server/core/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted([
        ...frameworkAndDatabase, 'node:*', 'zod', '**/application/**', '**/infrastructure/**', '**/platform/**', '**/bootstrap/**',
        '**/shared/contracts/**', '**/shared/validation/**'
      ], 'Domain models and ports are independent of HTTP, use cases, frameworks and persistence.')
    }
  },
  {
    files: ['server/features/**/application/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': restricted([
        ...frameworkAndDatabase, 'node:*', '**/infrastructure/**', '**/platform/**', '**/bootstrap/**'
      ], 'Application use cases depend on domain ports; inject runtime and persistence adapters.')
    }
  },
  {
    files: ['server/features/**/infrastructure/**/*.ts', 'server/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted(['**/application/**', '**/bootstrap/**'], 'Adapters implement domain ports and must not import use-case implementations or the composition root.')
    }
  },
  {
    files: ['server/api/**/*.ts', 'server/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted(['**/infrastructure/**', '**/platform/database/**', 'drizzle-orm', 'drizzle-orm/**', 'mysql2', 'mysql2/**'], 'HTTP/WebSocket routes validate input and delegate through the application container.')
    }
  },
  {
    files: ['app/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': restricted(['**/server/**', '@nuxt/nitro-server/**', 'nuxt/server', 'drizzle-orm', 'drizzle-orm/**', 'mysql2', 'mysql2/**'], 'Browser features communicate through injected API clients and shared contracts.')
    }
  },
  {
    files: ['app/features/**/api/*.ts'],
    rules: {
      'no-restricted-imports': restricted(['vue', '#imports', '#app', '**/components/**', '**/composables/**'], 'API clients receive a transport through their constructor and do not depend on Vue state or components.')
    }
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': restricted(['**/app/**', '**/server/**', ...frameworkAndDatabase, '@tiptap/**', 'node:*'], 'Shared values, contracts and validation are runtime independent.')
    }
  }
)
