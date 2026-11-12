<script setup lang="ts">
import { usePageDeletion } from '~/features/pages/composables/usePageDeletion'
import { useApi } from '~/core/http/useApi'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import WorkspaceSwitcher from '~/features/workspaces/components/WorkspaceSwitcher.vue'
import WorkspaceTree from '~/features/workspaces/components/WorkspaceTree.vue'
import { usePageCreation } from '~/features/pages/composables/usePageCreation'
import { useAuth } from '~/features/auth/composables/useAuth'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import type { PageItem } from '#shared/contracts/page'
import type { FolderItem } from '#shared/contracts/workspace'

const { folders: folderApi } = useApi()

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { data: overview, loading, error, refresh, pagesLoading, foldersLoading, membersLoading, pagesError, foldersError } = useWorkspace(workspaceId)
const route = useRoute()
const { state: auth, service: authService } = useAuth()
const toast = useToast()
const deleteOpen = ref(false)
const deletingPage = ref<PageItem | null>(null)
const deletePageOpen = ref(false)
const deletingFolder = ref<FolderItem | null>(null)
const search = ref('')
const workspace = computed(() => overview.value?.workspace)
const manager = computed(() => !!workspace.value && workspace.value.role !== 'member')
const home = computed(() => `/workspaces/${workspaceId}`)
const { deletePage: removePage } = usePageDeletion(workspaceId)
const { createPage } = usePageCreation(workspaceId)
function deleteFolder(folder: FolderItem) {
  deletingFolder.value = folder
  deleteOpen.value = true
}
async function confirmDelete() {
  if (deletingFolder.value) {
    await folderApi.delete(workspaceId, deletingFolder.value.id)
    await refreshWorkspace(workspaceId)
  }
}
function deletePage(page: PageItem) {
  deletingPage.value = page
  deletePageOpen.value = true
}
async function confirmDeletePage() {
  const page = deletingPage.value
  if (!page) {
    return
  }
  await removePage(page.id)
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
  <div class="flex flex-col h-full app-sidebar">
    <div class="px-3 pt-4 pb-4 space-y-4">
      <WorkspaceSwitcher
        v-if="workspace"
        :workspace="workspace"
      />
      <DataSkeleton
        v-else-if="loading"
        label="Loading workspace switcher"
        :rows="1"
      />
      <UAlert
        v-else-if="error"
        title="Unable to load workspace"
        color="error"
        :actions="[{ label: 'Retry', onClick: refresh }]"
      />
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a page…"
        aria-label="Find a page"
        size="sm"
        class="w-full"
        :ui="{ base: 'bg-default ring-muted placeholder:text-dimmed py-2' }"
      />
    </div>
    <nav
      class="flex-1 min-h-0 overflow-y-auto px-3 pb-5 space-y-6"
      aria-label="Workspace navigation"
    >
      <div class="space-y-1">
        <UButton
          label="Workspace home"
          icon="i-lucide-house"
          :to="home"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :class="{ 'is-active': route.path === home && !route.query.folder }"
          :ui="{ leadingIcon: 'size-4.5' }"
        />
        <UButton
          label="Members"
          aria-label="Members"
          icon="i-lucide-users"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :ui="{ leadingIcon: 'size-4.5' }"
          :to="`${home}/members`"
          :class="{ 'is-active': route.path === `${home}/members` }"
        >
          <template #trailing>
            <USkeleton
              v-if="membersLoading"
              class="ml-auto h-3 w-4"
            />
            <span
              v-else
              class="ml-auto text-xs text-muted"
            >{{ overview?.members.length }}</span>
          </template>
        </UButton>
        <UButton
          label="Settings"
          icon="i-lucide-settings-2"
          :to="`${home}/settings`"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :class="{ 'is-active': route.path === `${home}/settings` }"
          :ui="{ leadingIcon: 'size-4.5' }"
        />
      </div>
      <UAlert
        v-if="pagesError || foldersError"
        title="Unable to load navigation"
        color="error"
        :actions="[{ label: 'Retry', onClick: refresh }]"
      />
      <WorkspaceTree
        v-if="overview"
        :overview="overview"
        :pages-loading="pagesLoading"
        :folders-loading="foldersLoading"
        :search="search"
        @create-page="createPage"
        @clear-search="search = ''"
        @delete-folder="deleteFolder"
        @delete-page="deletePage"
      />
    </nav>
    <div class="p-3 space-y-3">
      <UButton
        v-if="manager"
        label="Invite teammates"
        icon="i-lucide-user-plus"
        color="primary"
        variant="soft"
        size="sm"
        class="w-full justify-start py-2 text-muted hover:text-highlighted"
        :to="`${home}/members#invite`"
      />
      <USeparator class="opacity-75" />
      <div class="flex items-center gap-2 px-1 pb-1">
        <UAvatar
          :alt="auth.user?.name || auth.user?.email"
          :src="auth.user?.avatar || undefined"
          size="sm"
          class="bg-primary/10 text-primary"
        />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-highlighted truncate">
            {{ auth.user?.name || auth.user?.email }}
          </p><p class="text-[11px] text-muted capitalize mt-0.5">
            {{ workspace?.role || '' }} workspace
          </p>
        </div>
        <UColorModeButton
          size="xs"
          color="neutral"
          variant="ghost"
        />
        <UTooltip text="Sign out">
          <UButton
            icon="i-lucide-log-out"
            aria-label="Sign out"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="logout"
          />
        </UTooltip>
      </div>
    </div>
    <ConfirmationDialog
      v-model:open="deletePageOpen"
      title="Delete page"
      :description="`“${deletingPage?.title || 'This page'}” will be deleted. This action cannot be undone.`"
      confirm-label="Delete"
      :on-confirm="confirmDeletePage"
    />
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete folder"
      :description="`“${deletingFolder?.name || 'This folder'}” will be deleted. Its pages will be moved to the workspace root.`"
      confirm-label="Delete"
      :on-confirm="confirmDelete"
    />
  </div>
</template>
