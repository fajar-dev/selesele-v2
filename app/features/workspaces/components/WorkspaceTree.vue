<script setup lang="ts">
import InlineTextField from '~/components/ui/InlineTextField.vue'
import WorkspacePageLink from '~/features/workspaces/components/WorkspacePageLink.vue'
import { usePageMovement } from '~/features/pages/composables/usePageMovement'
import { useWorkspaceFolders } from '~/features/workspaces/composables/useWorkspaceFolders'
import type { WorkspaceOverview, FolderItem } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'

const props = defineProps<{ overview: WorkspaceOverview, search: string }>()
const emit = defineEmits<{
  createPage: [folderId: string | null]
  clearSearch: []
  deleteFolder: [folder: FolderItem]
  deletePage: [page: PageItem]
}>()
const creatingFolder = ref(false)
const { createFolder } = useWorkspaceFolders(props.overview.workspace.id)
function beginFolder() {
  emit('clearSearch')
  creatingFolder.value = true
}
const route = useRoute()
const { movingPageId, announcement, movePage } = usePageMovement(() => props.overview)
const home = computed(() => `/workspaces/${props.overview.workspace.id}`)
const query = computed(() => props.search.trim().toLowerCase())
const matchingPages = computed(() => props.overview.pages.filter(page => page.title.toLowerCase().includes(query.value)))
const rootPages = computed(() => matchingPages.value.filter(page => !page.folderId))
const visibleFolders = computed(() => props.overview.folders.filter(folder => folder.name.toLowerCase().includes(query.value) || matchingPages.value.some(page => page.folderId === folder.id)))
const collapsed = ref(new Set<string>())
const draggedPage = ref<PageItem | null>(null)
const dropTarget = ref<string | null>(null)
const pageDragType = 'application/x-sele-page'
const rootTarget = 'workspace-root'
const addItems = [
  { label: 'Page', icon: 'i-lucide-file-plus', onSelect: () => emit('createPage', null) },
  { label: 'Folder', icon: 'i-lucide-folder-plus', onSelect: beginFolder }
]

function folderPages(folder: FolderItem) {
  const pages = folder.name.toLowerCase().includes(query.value) ? props.overview.pages : matchingPages.value
  return pages.filter(page => page.folderId === folder.id)
}
function folderItems(folder: FolderItem) {
  return [
    { label: 'Delete', color: 'error' as const, icon: 'i-lucide-trash', onSelect: () => emit('deleteFolder', folder) }
  ]
}
function toggleFolder(folderId: string) {
  if (collapsed.value.has(folderId)) {
    collapsed.value.delete(folderId)
  } else {
    collapsed.value.add(folderId)
  }
}
function startDrag(event: DragEvent, page: PageItem) {
  if (!event.dataTransfer || movingPageId.value) {
    event.preventDefault()
    return
  }
  draggedPage.value = page
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(pageDragType, page.id)
}
function endDrag() {
  draggedPage.value = null
  dropTarget.value = null
}
function canDrop(folderId: string | null) {
  return !!draggedPage.value && !movingPageId.value && draggedPage.value.folderId !== folderId
}
function dragOver(event: DragEvent, folderId: string | null) {
  if (!draggedPage.value) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  if (!canDrop(folderId)) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none'
    }
    dropTarget.value = null
    return
  }
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dropTarget.value = folderId || rootTarget
  if (folderId) {
    collapsed.value.delete(folderId)
  }
}
function dragLeave(event: DragEvent) {
  const target = event.currentTarget
  if (target instanceof HTMLElement && event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) {
    return
  }
  dropTarget.value = null
}
async function drop(event: DragEvent, folderId: string | null) {
  if (!draggedPage.value) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const page = draggedPage.value
  const valid = canDrop(folderId) && event.dataTransfer?.getData(pageDragType) === page.id
  endDrag()
  if (valid) {
    await movePage(page, folderId)
  }
}
watch(() => props.overview.workspace.id, () => {
  endDrag()
  collapsed.value.clear()
})
</script>

<template>
  <section
    aria-label="Pages and folders"
    :aria-busy="!!movingPageId"
    @keydown.esc="endDrag"
  >
    <div
      class="flex items-center justify-between gap-2 px-2 py-1 mb-2 rounded-[5px] transition-colors"
      :class="{ 'workspace-drop-target': dropTarget === rootTarget }"
      data-workspace-root-drop
      @dragover="dragOver($event, null)"
      @dragleave="dragLeave"
      @drop="drop($event, null)"
    >
      <span class="sidebar-section-label">Pages</span>
      <span
        v-if="draggedPage?.folderId"
        class="ml-auto text-[11px] text-muted"
      >Drop here to move out</span>
      <UDropdownMenu
        :items="addItems"
        :content="{ align: 'start' }"
      >
        <UButton
          icon="i-lucide-plus"
          aria-label="Add page or folder"
          size="xs"
          variant="ghost"
          color="neutral"
        />
      </UDropdownMenu>
    </div>
    <ul class="space-y-0.5">
      <li
        v-if="creatingFolder"
        class="flex items-start gap-2 px-2 py-1.5 text-[13px]"
      >
        <UIcon
          name="i-lucide-folder"
          class="size-4 shrink-0 mt-0.5 text-muted"
        />
        <InlineTextField
          value="Untitled folder"
          label="New folder name"
          fallback="Untitled folder"
          :maxlength="120"
          autofocus
          force-save
          :on-save="createFolder"
          @done="creatingFolder = false"
          @cancel="creatingFolder = false"
        />
      </li>

      <li
        v-for="folder in visibleFolders"
        :key="folder.id"
        :data-folder-id="folder.id"
      >
        <div
          class="group/folder flex items-center gap-1 rounded-[5px] min-h-[34px] px-1 hover:bg-(--app-hover) transition-colors"
          :class="{ 'workspace-drop-target': dropTarget === folder.id, 'bg-(--app-selected)': route.path === home && route.query.folder === folder.id }"
          @dragover="dragOver($event, folder.id)"
          @dragleave="dragLeave"
          @drop="drop($event, folder.id)"
        >
          <UButton
            icon="i-lucide-chevron-right"
            :aria-label="`${collapsed.has(folder.id) && !query ? 'Expand' : 'Collapse'} ${folder.name}`"
            :aria-expanded="!collapsed.has(folder.id) || !!query"
            :disabled="!!query"
            size="xs"
            color="neutral"
            variant="ghost"
            class="shrink-0 p-0.5"
            :ui="{ leadingIcon: `size-3 text-muted transition-transform ${!collapsed.has(folder.id) || query ? 'rotate-90' : ''}` }"
            @click="toggleFolder(folder.id)"
          />
          <NuxtLink
            :to="`${home}?folder=${folder.id}`"
            class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-[13px] text-toned"
            :aria-current="route.path === home && route.query.folder === folder.id ? 'page' : undefined"
          >
            <UIcon
              :name="!collapsed.has(folder.id) || query ? 'i-lucide-folder-open' : 'i-lucide-folder'"
              class="size-4 shrink-0 text-muted"
            />
            <span class="truncate">{{ folder.name }}</span>
          </NuxtLink>
          <UDropdownMenu :items="folderItems(folder)">
            <UButton
              icon="i-lucide-ellipsis"
              :aria-label="`Actions for ${folder.name}`"
              size="xs"
              variant="ghost"
              color="neutral"
              class="shrink-0 opacity-50 sm:opacity-0 sm:group-hover/folder:opacity-60 sm:group-focus-within/folder:opacity-100 focus-visible:opacity-100"
            />
          </UDropdownMenu>
        </div>
        <ul
          v-if="!collapsed.has(folder.id) || query"
          class="ml-5 border-l border-muted pl-1.5 mt-0.5 space-y-0.5"
        >
          <li
            v-for="page in folderPages(folder)"
            :key="page.id"
            :data-page-id="page.id"
          >
            <WorkspacePageLink
              :page="page"
              :home="home"
              :active="route.params.id === page.id"
              :moving="movingPageId === page.id"
              :disabled="!!movingPageId"
              @drag-page="startDrag"
              @end-drag="endDrag"
              @delete-page="emit('deletePage', $event)"
            />
          </li>
          <li
            v-if="!folderPages(folder).length"
            class="px-2 py-2 text-xs text-muted"
          >
            {{ draggedPage ? 'Drop on the folder to move here' : 'Empty folder' }}
          </li>
        </ul>
      </li>
      <li
        v-for="page in rootPages"
        :key="page.id"
        :data-page-id="page.id"
      >
        <WorkspacePageLink
          :page="page"
          :home="home"
          :active="route.params.id === page.id"
          :moving="movingPageId === page.id"
          :disabled="!!movingPageId"
          @drag-page="startDrag"
          @end-drag="endDrag"
          @delete-page="emit('deletePage', $event)"
        />
      </li>
    </ul>
    <p
      v-if="query && !rootPages.length && !visibleFolders.length"
      class="px-2 py-3 text-xs text-muted"
    >
      No pages or folders match “{{ search }}”.
    </p>
    <p
      v-else-if="!overview.pages.length && !overview.folders.length"
      class="px-2 py-2 text-xs leading-relaxed text-muted"
    >
      Add your first page or folder.
    </p>
    <p
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
  </section>
</template>
