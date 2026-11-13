<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { libraryKeys } from '~/features/library/state/libraryKeys'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useDebounce } from '@vueuse/core'
import { useApi } from '~/core/http/useApi'
import { useLibrarySearch } from '../composables/useLibrarySearch'
import { usePersonalLibrary } from '../composables/usePersonalLibrary'
import { useAuth } from '~/features/auth/composables/useAuth'
import type { LibraryEntry } from '#shared/contracts/library'

const open = useLibrarySearch()
const { state: auth } = useAuth()
const { library } = useApi()
const personal = usePersonalLibrary()
const search = ref('')
const searchInput = { 'aria-label': 'Search all content', 'placeholder': 'Search your workspace…' }
const closeButton = { 'size': 'xs' as const, 'aria-label': 'Close search' }
const query = useDebounce(search, 200)
const { data, status, error, refresh } = useLazyAsyncData(libraryKeys.search, async () => open.value && query.value.trim() ? (await library.search(query.value)).data : [], { server: false, default: () => [], watch: [query, open] })
const icons = { item: 'i-lucide-file-text', folder: 'i-lucide-folder', workspace: 'i-lucide-panels-top-left' }
const group = (id: string, label: string, entries: LibraryEntry[]) => ({ id, label, ignoreFilter: true, items: entries.map(item => ({ id: `${item.kind}:${item.id}`, label: item.title, description: plainTextSnippet(item.snippet), emoji: item.icon, icon: icons[item.kind], to: libraryPath(item), onSelect: () => {
  open.value = false
} })) })
const searching = computed(() => !!search.value.trim() && (search.value.trim() !== query.value.trim() || status.value === 'pending'))
const groups = computed(() => {
  if (searching.value) {
    return []
  }
  return query.value.trim()
    ? [group('items', 'Items', data.value.filter(item => item.kind === 'item')), group('folders', 'Folders', data.value.filter(item => item.kind === 'folder')), group('workspaces', 'Workspaces', data.value.filter(item => item.kind === 'workspace'))].filter(item => item.items.length)
    : [group('recent', 'Recently opened', personal.data.value.recent.slice(0, 6))]
})
watch(open, (value) => {
  if (!value) {
    search.value = ''
  }
})
function shortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && auth.authenticated) {
    event.preventDefault()
    open.value = !open.value
  }
}
onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
useFeedbackToast(error, { key: libraryKeys.search, title: 'Unable to search content', recovered: () => status.value === 'success', retry: () => refresh() })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Search your workspaces"
    description="Search the titles and contents of your items, folders, and workspaces."
    :ui="{ overlay: 'bg-black/25 dark:bg-black/45', content: 'sm:max-w-search rounded-lg sm:top-command sm:translate-y-0', header: 'sr-only', body: 'p-ui-zero sm:p-ui-zero' }"
  >
    <template #body>
      <UCommandPalette
        v-model:search-term="search"
        :groups="groups"
        :loading="status === 'pending'"
        :input="searchInput"
        :fuse="{ resultLimit: 50 }"
        :close="closeButton"
        :ui="{ root: 'divide-muted', input: '[&>input]:h-ui-8xl [&>input]:text-sm px-ui-md', content: 'max-h-command-panel', group: 'p-ui-sm', label: 'px-ui-md pt-ui-md pb-ui-sm text-xs font-medium text-muted', item: 'px-ui-md py-ui-sm gap-ui-md before:rounded-sm', itemDescription: 'text-xs mt-ui-2xs truncate', itemLabelBase: 'font-medium', footer: 'px-ui-lg py-ui-sm bg-muted/30', empty: 'py-ui-5xl px-ui-2xl' }"
        @update:open="open = $event"
      >
        <template #item-leading="{ item }">
          <span
            v-if="item.emoji"
            class="text-lg shrink-0 leading-relaxed"
          >{{ item.emoji }}</span><UIcon
            v-else
            :name="item.icon"
            class="size-ui-lg mt-ui-2xs text-muted shrink-0"
          />
        </template>
        <template #empty>
          <div
            v-if="searching"
            class="w-full space-y-ui-xl px-ui-sm py-ui-sm text-left"
            role="status"
            aria-label="Searching your workspaces"
          >
            <div
              v-for="row in 3"
              :key="row"
              class="flex gap-ui-md"
            >
              <USkeleton
                aria-hidden="true"
                class="size-ui-2xl shrink-0"
              /><div class="flex-1 space-y-ui-sm">
                <USkeleton
                  aria-hidden="true"
                  class="h-ui-md w-proportion-three-quarters"
                /><USkeleton
                  aria-hidden="true"
                  class="h-ui-sm w-proportion-half"
                />
              </div>
            </div>
          </div>
          <DataRetry
            v-else-if="error"
            :feedback-keys="['library:search']"
            :on-retry="() => refresh()"
          />
          <div
            v-else
            class="flex flex-col items-center text-center gap-ui-sm"
          >
            <UIcon
              name="i-lucide-search"
              class="size-ui-2xl mb-ui-xs text-dimmed"
            /><p class="text-sm font-medium text-toned">
              {{ search ? 'No results found' : 'Find the item you need' }}
            </p><p class="text-xs text-muted">
              {{ search ? 'Try a different word or an item title.' : 'Search by title or anything written inside an item.' }}
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex items-center justify-between text-xs text-muted">
            <span class="flex items-center gap-ui-sm"><UIcon
              name="i-lucide-arrow-up-down"
              class="size-ui-md"
            /> Navigate <UKbd
              value="enter"
              class="ms-ui-sm"
            /> Open</span><span class="flex items-center gap-ui-sm"><UKbd value="esc" /> Close</span>
          </div>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
