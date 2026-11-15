<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { libraryKeys } from '~/features/library/state/libraryKeys'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useDebounce } from '@vueuse/core'
import { useApi } from '~/core/http/useApi'
import { useLibrarySearch } from '../composables/useLibrarySearch'
import { usePersonalLibrary } from '../composables/usePersonalLibrary'
import { useAuth } from '~/features/authentication/composables/useAuth'
import SearchHighlight from './SearchHighlight.vue'
import type { SearchFilters, SavedSearch } from '#shared/model/itemResources'
import type { ItemKind } from '#shared/model/content'
import type { MemberItem } from '#shared/model/member'
import type { FolderItem } from '#shared/model/workspace'
import type { LibraryEntry } from '#shared/model/library'

const open = useLibrarySearch()
const { state: auth } = useAuth()
const toast = useToast()
const api = useApi()
const { library } = api
const personal = usePersonalLibrary()
const search = ref('')
const searchInput = { 'aria-label': 'Search all content', 'placeholder': 'Search your workspace…' }
const closeButton = { 'size': 'xs' as const, 'aria-label': 'Close search' }
const workspace = ref('__all'), kind = ref('__all'), author = ref('__all'), folder = ref('__all'), after = ref(''), before = ref(''), label = ref(''), savedName = ref(''), saving = ref(false)
const members = ref<MemberItem[]>([]), folders = ref<FolderItem[]>([])
const spaces = useRealtimeQuery('search:workspaces', async () => (await api.workspaces.list()).data, { server: false, immediate: false, default: () => [] })
const saved = useRealtimeQuery('search:saved', async () => (await api.itemResources.searches()).data, { server: false, immediate: false, default: () => [] })
const filters = computed<SearchFilters>(() => ({ kind: kind.value === '__all' ? undefined : kind.value as ItemKind, createdBy: author.value === '__all' ? undefined : author.value, folderId: folder.value === '__all' ? undefined : folder.value, updatedAfter: after.value || undefined, updatedBefore: before.value || undefined, label: label.value.trim() || undefined }))
const filtered = computed(() => workspace.value !== '__all' || Object.values(filters.value).some(Boolean))
watch(workspace, async (id, _previous, onCleanup) => {
  let stale = false
  onCleanup(() => {
    stale = true
  })
  members.value = []
  folders.value = []
  if (id === '__all') {
    return
  }
  try {
    const [people, directories] = await Promise.all([api.members.roster(id), api.folders.list(id)])
    if (stale) {
      return
    }
    members.value = people.data
    folders.value = directories.data
  } catch { /* Search still enforces access and reports request failures. */ }
})
function resetFilters() {
  workspace.value = '__all'
  kind.value = '__all'
  author.value = '__all'
  folder.value = '__all'
  after.value = ''
  before.value = ''
  label.value = ''
}
function applySaved(value: SavedSearch) {
  search.value = value.query
  workspace.value = value.workspaceId || '__all'
  kind.value = value.filters.kind || '__all'
  author.value = value.filters.createdBy || '__all'
  folder.value = value.filters.folderId || '__all'
  after.value = value.filters.updatedAfter || ''
  before.value = value.filters.updatedBefore || ''
  label.value = value.filters.label || ''
}
async function saveSearch() {
  if (!savedName.value.trim()) {
    return
  }
  saving.value = true
  try {
    await api.itemResources.saveSearch({ name: savedName.value.trim(), query: search.value.trim(), workspaceId: workspace.value === '__all' ? null : workspace.value, filters: filters.value })
    await saved.refresh()
    savedName.value = ''
  } catch (cause) {
    toast.add({ title: 'Unable to save search', description: errorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function removeSaved(id: string) {
  try {
    await api.itemResources.removeSearch(id)
    await saved.refresh()
  } catch (cause) {
    toast.add({ title: 'Unable to remove saved search', description: errorMessage(cause), color: 'error' })
  }
}
const query = useDebounce(search, 200)
const { data, status, error, refresh } = useRealtimeQuery(libraryKeys.search, async () => open.value && (query.value.trim() || filtered.value) ? (await library.search(query.value, workspace.value === '__all' ? undefined : workspace.value, filters.value)).data : [], { server: false, default: () => [], watch: [query, open, filters, workspace] })
const icons = { item: 'i-lucide-file-text', folder: 'i-lucide-folder', workspace: 'i-lucide-panels-top-left' }
const group = (id: string, label: string, entries: LibraryEntry[]) => ({ id, label, ignoreFilter: true, items: entries.map(item => ({ id: `${item.kind}:${item.id}`, label: item.title, description: plainTextSnippet(item.snippet), emoji: item.icon, icon: icons[item.kind], to: libraryPath(item), onSelect: () => {
  open.value = false
} })) })
const searching = computed(() => !!search.value.trim() && (search.value.trim() !== query.value.trim() || status.value === 'pending'))
const groups = computed(() => {
  if (searching.value) {
    return []
  }
  return query.value.trim() || filtered.value
    ? [group('items', 'Items', data.value.filter(item => item.kind === 'item')), group('folders', 'Folders', data.value.filter(item => item.kind === 'folder')), group('workspaces', 'Workspaces', data.value.filter(item => item.kind === 'workspace'))].filter(item => item.items.length)
    : [group('recent', 'Recently opened', personal.data.value.recent.slice(0, 6))]
})
watch(open, (value) => {
  if (!value) {
    search.value = ''
    resetFilters()
  } else {
    void spaces.refresh()
    void saved.refresh()
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
      <div class="p-ui-md space-y-ui-sm border-b border-muted">
        <div class="flex flex-wrap gap-ui-sm">
          <USelect
            v-model="workspace"
            :items="[{ label: 'All workspaces', value: '__all' }, ...spaces.data.value.map(space => ({ label: space.name, value: space.id }))]"
            aria-label="Search workspace"
            size="sm"
          />
          <USelect
            v-model="kind"
            :items="[{ label: 'All item types', value: '__all' }, ...['document', 'kanban', 'whiteboard', 'diagram'].map(value => ({ label: value, value }))]"
            aria-label="Search item type"
            size="sm"
          />
          <USelect
            v-model="author"
            :disabled="workspace === '__all'"
            :items="[{ label: 'Any creator', value: '__all' }, ...members.filter(member => member.userId).map(member => ({ label: member.name || member.email, value: member.userId! }))]"
            aria-label="Search creator"
            size="sm"
          />
          <USelect
            v-model="folder"
            :disabled="workspace === '__all'"
            :items="[{ label: 'Any folder', value: '__all' }, ...folders.map(folder => ({ label: folder.name, value: folder.id }))]"
            aria-label="Search folder"
            size="sm"
          />
          <UInput
            v-model="label"
            aria-label="Task label filter"
            placeholder="Task label"
            size="sm"
            :maxlength="40"
          />
          <UInput
            v-model="after"
            type="date"
            aria-label="Updated after"
            size="sm"
          /><UInput
            v-model="before"
            type="date"
            aria-label="Updated before"
            size="sm"
          />
          <UButton
            v-if="filtered"
            label="Clear filters"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="resetFilters"
          />
        </div>
        <div class="flex flex-wrap items-center gap-ui-sm">
          <UPopover>
            <UButton
              label="Saved searches"
              icon="i-lucide-bookmark"
              size="sm"
              color="neutral"
              variant="ghost"
            /><template #content>
              <div class="p-ui-sm space-y-ui-xs max-w-sidebar-mobile">
                <p
                  v-if="!saved.data.value.length"
                  class="text-xs text-muted p-ui-sm"
                >
                  No saved searches yet.
                </p><div
                  v-for="entry in saved.data.value"
                  :key="entry.id"
                  class="flex gap-ui-xs"
                >
                  <UButton
                    :label="entry.name"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    class="flex-1 justify-start"
                    @click="applySaved(entry)"
                  /><UButton
                    icon="i-lucide-trash-2"
                    :aria-label="`Remove saved search ${entry.name}`"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    @click="removeSaved(entry.id)"
                  />
                </div>
              </div>
            </template>
          </UPopover>
          <template v-if="search.trim() || filtered">
            <UInput
              v-model="savedName"
              placeholder="Name this search"
              aria-label="Saved search name"
              size="sm"
              :maxlength="80"
            /><UButton
              label="Save search"
              size="sm"
              color="neutral"
              variant="ghost"
              :disabled="!savedName.trim()"
              :loading="saving"
              @click="saveSearch"
            />
          </template>
        </div>
      </div>
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
        <template #item-label="{ item }">
          <SearchHighlight
            :text="String(item.label || '')"
            :query="query"
          />
        </template>
        <template #item-description="{ item }">
          <SearchHighlight
            :text="String(item.description || '')"
            :query="query"
          />
        </template>
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
