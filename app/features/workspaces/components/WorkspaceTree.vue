<script setup lang="ts">
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'
import MoveAccessConfirmation from '~/features/pages/components/MoveAccessConfirmation.vue'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import { usePageTemplates } from '~/features/library/composables/usePageTemplates'
import EntityIcon from '~/components/ui/EntityIcon.vue'
import { DEFAULT_FOLDER_ICON } from '#shared/kernel/icons'
import WorkspacePageLink from '~/features/workspaces/components/WorkspacePageLink.vue'
import { usePageMovement } from '~/features/pages/composables/usePageMovement'
import { useWorkspaceFolders } from '~/features/workspaces/composables/useWorkspaceFolders'
import type { WorkspaceOverview, FolderItem } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'

const props = defineProps<{
  overview: WorkspaceOverview
  pagesLoading: boolean
  foldersLoading: boolean
}>()
const emit = defineEmits<{
  createPage: [
        folderId: string | null
  ]
  deleteFolder: [
        folder: FolderItem
  ]
  deletePage: [
        page: PageItem
  ]
}>()
const writable = computed(() => !props.overview.workspace.archivedAt)
const canPage = computed(() => writable.value && allowsWorkspaceAction(props.overview.workspace.role, props.overview.workspace.settings, 'createPages'))
const canFolder = computed(() => writable.value && allowsWorkspaceAction(props.overview.workspace.role, props.overview.workspace.settings, 'createFolders'))
const canDelete = computed(() => writable.value && allowsWorkspaceAction(props.overview.workspace.role, props.overview.workspace.settings, 'deleteContent'))
const accessFolder = ref<FolderItem | null>(null)
const creatingFromMenu = ref(false)
const { createFolder, creatingFolder } = useWorkspaceFolders(props.overview.workspace.id)
function beginFolder() {
  creatingFromMenu.value = true
  void createFolder()
}
function beginPage(folderId: string | null) {
  creatingFromMenu.value = true
  emit('createPage', folderId)
}
function preserveCreationFocus(event: Event) {
  if (creatingFromMenu.value) {
    event.preventDefault()
    creatingFromMenu.value = false
  }
}
const route = useRoute()
const { movingPageId, announcement, pendingMove, movePage, confirmMove } = usePageMovement(() => props.overview)
const moveOpen = computed({ get: () => !!pendingMove.value, set: (value) => {
  if (!value) {
    pendingMove.value = null
  }
} })
const home = computed(() => `/workspaces/${props.overview.workspace.id}`)
const rootPages = computed(() => props.overview.pages.filter(page => !page.folderId && !page.archivedAt))
const templates = usePageTemplates(props.overview.workspace.id, () => {
  creatingFromMenu.value = true
})
const collapsed = ref(new Set<string>())
const draggedPage = ref<PageItem | null>(null)
const dropTarget = ref<string | null>(null)
const pageDragType = 'application/x-sele-page'
const rootTarget = 'workspace-root'
const addItems = computed(() => [
  ...(canPage.value ? [{ label: 'Page', icon: 'i-lucide-file-plus', onSelect: () => beginPage(null) }, templates.items(null)] : []),
  ...(canFolder.value ? [{ label: 'Folder', icon: 'i-lucide-folder-plus', onSelect: beginFolder }] : [])
])
function folderPages(folder: FolderItem) {
  return props.overview.pages.filter(page => page.folderId === folder.id && !page.archivedAt)
}
function folderItems(folder: FolderItem) {
  return [
    ...(canPage.value && folder.accessLevel === 'edit' ? [{ label: 'New page', icon: 'i-lucide-file-plus', onSelect: () => beginPage(folder.id) }, templates.items(folder.id)] : []),
    ...(folder.canManageAccess
      ? [{ label: 'Manage access', icon: 'i-lucide-shield-check', onSelect: () => {
          accessFolder.value = folder
        } }]
      : []),
    ...(canDelete.value && folder.accessLevel === 'edit' ? [{ label: 'Delete', color: 'error' as const, icon: 'i-lucide-trash', onSelect: () => emit('deleteFolder', folder) }] : [])
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
  if (!event.dataTransfer || movingPageId.value || page.accessLevel !== 'edit') {
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
  return (!folderId || props.overview.folders.some(folder => folder.id === folderId && folder.accessLevel === 'edit')) && !!draggedPage.value && !movingPageId.value && draggedPage.value.folderId !== folderId
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
      class="flex items-center justify-between gap-ui-sm px-ui-sm py-ui-xs mb-ui-sm rounded-md transition-colors"
      :class="{ 'workspace-drop-target': dropTarget === rootTarget }"
      data-workspace-root-drop
      @dragover="dragOver($event, null)"
      @dragleave="dragLeave"
      @drop="drop($event, null)"
    >
      <span class="sidebar-section-label">Pages</span>
      <span
        v-if="draggedPage?.folderId"
        class="ml-auto text-xs text-muted"
      >Drop here to move out</span>
      <UDropdownMenu
        v-if="addItems.length"
        :items="addItems"
        :content="{ align: 'start', onCloseAutoFocus: preserveCreationFocus }"
        @update:open="templates.load"
      >
        <UButton
          icon="i-lucide-plus"
          aria-label="Add page or folder"
          :loading="creatingFolder"
          size="xs"
          variant="ghost"
          color="neutral"
        />
      </UDropdownMenu>
    </div>
    <ul class="space-y-ui-2xs min-w-ui-zero overflow-hidden">
      <li
        v-for="folder in overview.folders"
        :key="folder.id"
        :data-folder-id="folder.id"
      >
        <div
          class="group/folder flex items-center gap-ui-xs rounded-md min-h-ui-4xl px-ui-xs hover:bg-(--app-hover) transition-colors"
          :class="{ 'workspace-drop-target': dropTarget === folder.id, 'bg-(--app-selected)': route.path === home && route.query.folder === folder.id }"
          @dragover="dragOver($event, folder.id)"
          @dragleave="dragLeave"
          @drop="drop($event, folder.id)"
        >
          <UButton
            icon="i-lucide-chevron-right"
            :aria-label="`${collapsed.has(folder.id) ? 'Expand' : 'Collapse'} ${folder.name}`"
            :aria-expanded="!collapsed.has(folder.id)"
            size="xs"
            color="neutral"
            variant="ghost"
            class="shrink-0 p-ui-2xs"
            :ui="{ leadingIcon: `size-ui-md text-muted transition-transform ${!collapsed.has(folder.id) ? 'rotate-90' : ''}` }"
            @click="toggleFolder(folder.id)"
          />
          <NuxtLink
            :to="`${home}?folder=${folder.id}`"
            class="flex min-w-ui-zero flex-1 items-center gap-ui-sm py-ui-xs text-xs text-toned"
            :aria-current="route.path === home && route.query.folder === folder.id ? 'page' : undefined"
          >
            <EntityIcon
              :value="folder.icon || DEFAULT_FOLDER_ICON"
              class="size-ui-lg text-base text-muted"
            />
            <span
              class="min-w-ui-zero flex-1 truncate"
              :title="folder.name"
            >{{ folder.name }}</span>
          </NuxtLink>
          <UDropdownMenu
            v-if="folderItems(folder).length"
            :items="folderItems(folder)"
            :content="{ align: 'start', onCloseAutoFocus: preserveCreationFocus }"
            @update:open="templates.load"
          >
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
          v-if="!collapsed.has(folder.id)"
          class="ml-ui-xl border-l border-muted pl-ui-xs mt-ui-2xs space-y-ui-2xs"
        >
          <li
            v-for="page in folderPages(folder)"
            :key="page.id"
            :data-page-id="page.id"
          >
            <WorkspacePageLink
              :can-delete="canDelete && page.accessLevel === 'edit'"
              :page="page"
              :home="home"
              :active="route.params.id === page.id"
              :moving="movingPageId === page.id"
              :disabled="!!movingPageId || !writable"
              @drag-page="startDrag"
              @end-drag="endDrag"
              @delete-page="emit('deletePage', $event)"
            />
          </li>
          <li
            v-if="!pagesLoading && !folderPages(folder).length"
            class="px-ui-sm py-ui-sm text-xs text-muted"
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
          :can-delete="canDelete && page.accessLevel === 'edit'"
          :page="page"
          :home="home"
          :active="route.params.id === page.id"
          :moving="movingPageId === page.id"
          :disabled="!!movingPageId || !writable"
          @drag-page="startDrag"
          @end-drag="endDrag"
          @delete-page="emit('deletePage', $event)"
        />
      </li>
    </ul>
    <p
      v-if="!pagesLoading && !foldersLoading && !overview.pages.length && !overview.folders.length"
      class="px-ui-sm py-ui-sm text-xs leading-relaxed text-muted"
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
  <ResourceAccessPanel
    v-if="accessFolder"
    :workspace-id="overview.workspace.id"
    kind="folder"
    :resource-id="accessFolder.id"
    @close="accessFolder = null"
  />
  <MoveAccessConfirmation
    v-if="pendingMove"
    v-model:open="moveOpen"
    :impact="pendingMove.impact"
    :busy="!!movingPageId"
    :on-confirm="confirmMove"
  />
</template>
