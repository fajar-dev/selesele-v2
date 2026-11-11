<script setup lang="ts">
import type { WorkspaceOverview, FolderItem } from '#shared/types/workspace'
import type { PageItem } from '#shared/types/page'
import { workspaceService } from '~/services/workspaceService'

const props = defineProps<{ overview: WorkspaceOverview }>()
const route = useRoute()
const { state: auth, service: authService } = useAuth()
const toast = useToast()
const pageOpen = ref(false)
const folderOpen = ref(false)
const membersOpen = ref(false)
const renameOpen = ref(false)
const deleteOpen = ref(false)
const editingFolder = ref<FolderItem | null>(null)
const deletingFolder = ref<FolderItem | null>(null)
const deletingWorkspace = ref(false)
const defaultFolder = ref<string | null>(null)
const search = ref('')
const workspace = computed(() => props.overview.workspace)
const manager = computed(() => workspace.value.role !== 'member')
const filteredPages = computed(() => props.overview.pages.filter(page => page.title.toLowerCase().includes(search.value.toLowerCase())))
const home = computed(() => `/workspaces/${workspace.value.id}`)
const folderItems = (folder: FolderItem) => [
  { label: 'New page', icon: 'i-lucide-file-plus', onSelect: () => newPage(folder.id) },
  { label: 'Rename folder', icon: 'i-lucide-pencil', onSelect: () => {
    editingFolder.value = folder
    folderOpen.value = true
  } },
  { label: 'Delete folder', icon: 'i-lucide-trash', onSelect: () => {
    deletingFolder.value = folder
    deletingWorkspace.value = false
    deleteOpen.value = true
  } }
]
const workspaceItems = computed(() => [
  { label: 'All workspaces', to: '/' },
  ...(manager.value
    ? [{ label: 'Rename workspace', onSelect: () => {
        renameOpen.value = true
      } }]
    : []),
  ...(workspace.value.role === 'owner'
    ? [{ label: 'Delete workspace', onSelect: () => {
        deletingWorkspace.value = true
        deleteOpen.value = true
      } }]
    : [])
])
function newFolder() {
  editingFolder.value = null
  folderOpen.value = true
}

function newPage(folderId: string | null = null) {
  defaultFolder.value = folderId
  pageOpen.value = true
}
async function created(page: PageItem) {
  await refreshWorkspace(workspace.value.id)
  await navigateTo(`${home.value}/pages/${page.id}`)
}
async function saveFolder(name: string) {
  if (editingFolder.value) {
    await workspaceService.renameFolder(workspace.value.id, editingFolder.value.id, name)
  } else {
    await workspaceService.createFolder(workspace.value.id, name)
  }
  await refreshWorkspace(workspace.value.id)
}
async function rename(name: string) {
  await workspaceService.rename(workspace.value.id, name)
  await refreshWorkspace(workspace.value.id)
}
async function confirmDelete() {
  if (deletingWorkspace.value) {
    await workspaceService.delete(workspace.value.id)
    await refreshNuxtData('workspace-home')
    await navigateTo('/')
  } else if (deletingFolder.value) {
    await workspaceService.deleteFolder(workspace.value.id, deletingFolder.value.id)
    await refreshWorkspace(workspace.value.id)
  }
}
async function logout() {
  try {
    await authService.logout()
  } catch (cause) {
    toast.add({ title: 'Unable to sign out', description: errorMessage(cause), color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-3 border-b border-default">
      <UDropdownMenu
        :items="workspaceItems"
        :content="{ align: 'start' }"
      >
        <UButton
          :label="workspace.name"
          trailing-icon="i-lucide-chevrons-up-down"
          color="neutral"
          variant="ghost"
          class="w-full justify-between font-semibold"
        >
          <template #leading>
            <span class="text-xl">{{ workspace.icon }}</span>
          </template>
        </UButton>
      </UDropdownMenu>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a page…"
        aria-label="Find a page"
        size="sm"
        class="w-full mt-3"
      />
    </div>
    <nav
      class="flex-1 min-h-0 overflow-y-auto p-3 space-y-4"
      aria-label="Workspace navigation"
    >
      <div class="space-y-1">
        <UButton
          label="Workspace home"
          icon="i-lucide-house"
          :to="home"
          color="neutral"
          :variant="route.path === home ? 'soft' : 'ghost'"
          class="w-full justify-start"
        />
        <UButton
          label="Members"
          icon="i-lucide-users"
          color="neutral"
          variant="ghost"
          class="w-full justify-start"
          @click="membersOpen = true"
        />
      </div>
      <div>
        <div class="flex items-center justify-between px-2 mb-2 text-xs text-muted uppercase tracking-wide">
          <span>Pages</span>
          <UButton
            icon="i-lucide-plus"
            aria-label="Create page"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="newPage()"
          />
        </div>
        <NuxtLink
          v-for="page in filteredPages.filter(item => !item.folderId)"
          :key="page.id"
          :to="`${home}/pages/${page.id}`"
          class="flex gap-2 items-center rounded-md px-2 py-1.5 text-sm hover:bg-elevated"
          :class="{ 'bg-elevated font-medium': route.params.id === page.id }"
        >
          <span>{{ page.icon || '📄' }}</span><span class="truncate">{{ page.title }}</span>
        </NuxtLink>
        <p
          v-if="!overview.pages.length"
          class="px-2 py-2 text-sm text-dimmed"
        >
          No pages yet
        </p>
      </div>
      <div>
        <div class="flex items-center justify-between px-2 mb-2 text-xs text-muted uppercase tracking-wide">
          <span>Folders</span>
          <UButton
            icon="i-lucide-folder-plus"
            aria-label="Create folder"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="newFolder"
          />
        </div>
        <details
          v-for="folder in overview.folders"
          :key="folder.id"
          open
          class="group mb-1"
        >
          <summary class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated list-none">
            <UIcon
              name="i-lucide-folder"
              class="size-4 shrink-0 text-muted"
            />
            <NuxtLink
              :to="`${home}?folder=${folder.id}`"
              class="truncate flex-1"
              @click.stop
            >{{ folder.name }}</NuxtLink>
            <UDropdownMenu :items="folderItems(folder)">
              <UButton
                icon="i-lucide-ellipsis"
                :aria-label="`Actions for ${folder.name}`"
                size="xs"
                variant="ghost"
                color="neutral"
                @click.stop
              />
            </UDropdownMenu>
          </summary>
          <div class="ml-4 border-l border-default pl-1">
            <NuxtLink
              v-for="page in filteredPages.filter(item => item.folderId === folder.id)"
              :key="page.id"
              :to="`${home}/pages/${page.id}`"
              class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated"
              :class="{ 'bg-elevated font-medium': route.params.id === page.id }"
            >
              <span>{{ page.icon || '📄' }}</span><span class="truncate">{{ page.title }}</span>
            </NuxtLink>
            <p
              v-if="!overview.pages.some(page => page.folderId === folder.id)"
              class="p-2 text-xs text-dimmed"
            >
              Empty folder
            </p>
          </div>
        </details>
      </div>
    </nav>
    <div class="border-t border-default p-3 space-y-3">
      <div class="flex items-center gap-2">
        <UAvatar
          :alt="auth.user?.name || auth.user?.email"
          size="xs"
        /><span class="text-xs truncate flex-1">{{ auth.user?.name || auth.user?.email }}</span><UColorModeButton size="xs" /><UButton
          icon="i-lucide-log-out"
          aria-label="Sign out"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="logout"
        />
      </div>
    </div>
    <PagesFormModal
      v-model:open="pageOpen"
      :workspace-id="workspace.id"
      :folders="overview.folders"
      :default-folder-id="defaultFolder"
      @success="created"
    />
    <WorkspacesNameModal
      v-model:open="folderOpen"
      :title="editingFolder ? 'Rename folder' : 'Create folder'"
      description="Keep related pages together."
      :initial-name="editingFolder?.name || ''"
      :on-save="saveFolder"
    />
    <WorkspacesNameModal
      v-model:open="renameOpen"
      title="Rename workspace"
      description="Choose a name for your shared space."
      :initial-name="workspace.name"
      :on-save="rename"
    />
    <WorkspacesMemberModal
      v-model:open="membersOpen"
      :overview="overview"
    />
    <DeleteConfirmModal
      v-model:open="deleteOpen"
      :title="deletingWorkspace ? 'Delete workspace' : 'Delete folder'"
      :description="deletingWorkspace ? 'All pages and folders in this workspace will become inaccessible.' : 'Pages in this folder will be moved to the workspace root.'"
      :on-confirm="confirmDelete"
    />
  </div>
</template>
