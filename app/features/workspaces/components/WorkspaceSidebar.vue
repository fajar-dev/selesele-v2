<script setup lang="ts">
import DataRetry from '~/components/ui/DataRetry.vue'
import { libraryKeys } from '~/features/library/state/libraryKeys'
import WorkspaceFavorites from '~/features/library/components/WorkspaceFavorites.vue'
import { useLibrarySearch } from '~/features/library/composables/useLibrarySearch'
import { useItemDeletion } from '~/features/items/composables/useItemDeletion'
import { useApi } from '~/core/http/useApi'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import WorkspaceSwitcher from '~/features/workspaces/components/WorkspaceSwitcher.vue'
import WorkspaceTree from '~/features/workspaces/components/WorkspaceTree.vue'
import { useItemCreation } from '~/features/items/composables/useItemCreation'
import { useAuth } from '~/features/auth/composables/useAuth'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspace, refreshWorkspace } from '~/features/workspaces/composables/useWorkspace'
import type { ContentItem } from '#shared/contracts/item'
import type { FolderItem } from '#shared/contracts/workspace'

const { folders: folderApi } = useApi()
const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data: overview, loading, error, refresh, itemsLoading, foldersLoading, membersLoading, itemsError, foldersError } = useWorkspace(workspaceId)
const route = useRoute()
const { state: auth, service: authService } = useAuth()
const toast = useToast()
const deleteOpen = ref(false)
const deletingItem = ref<ContentItem | null>(null)
const deleteItemOpen = ref(false)
const deletingFolder = ref<FolderItem | null>(null)
const searchOpen = useLibrarySearch()
const workspace = computed(() => overview.value?.workspace)
const manager = computed(() => !!workspace.value && ['owner', 'admin'].includes(workspace.value.role))
const home = computed(() => `/workspaces/${workspaceId}`)
const { deleteItem: removeItem } = useItemDeletion(workspaceId)
const { createItem } = useItemCreation(workspaceId)
function deleteFolder(folder: FolderItem) {
  deletingFolder.value = folder
  deleteOpen.value = true
}
async function confirmDelete() {
  if (deletingFolder.value) {
    const viewingChild = overview.value?.items.some(item => item.folderId === deletingFolder.value!.id && item.id === route.params.id)
    await folderApi.delete(workspaceId, deletingFolder.value.id)
    void refreshNuxtData(libraryKeys.personal)
    if (viewingChild) {
      await navigateTo(home.value)
    }
    await refreshWorkspace(workspaceId)
  }
}
function deleteItem(item: ContentItem) {
  deletingItem.value = item
  deleteItemOpen.value = true
}
async function confirmDeleteItem() {
  const item = deletingItem.value
  if (!item) {
    return
  }
  await removeItem(item.id)
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
    <div class="px-ui-md pt-ui-lg pb-ui-lg space-y-ui-lg">
      <WorkspaceSwitcher
        v-if="workspace"
        :workspace="workspace"
      />
      <DataSkeleton
        v-else-if="loading"
        label="Loading workspace switcher"
        :rows="1"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`workspaces:${workspaceId}`]"
        :on-retry="refresh"
      />
      <UButton
        label="Search"
        aria-label="Search all content"
        icon="i-lucide-search"
        color="neutral"
        variant="ghost"
        class="sidebar-link"
        @click="searchOpen = true"
      >
        <template #trailing>
          <span class="ms-auto text-xs text-muted">⌘ / Ctrl K</span>
        </template>
      </UButton>
    </div>
    <nav
      class="flex-1 min-h-ui-zero overflow-y-auto px-ui-md pb-ui-xl space-y-ui-2xl"
      aria-label="Workspace navigation"
    >
      <div class="space-y-ui-xs">
        <UButton
          label="Workspace home"
          icon="i-lucide-house"
          :to="`${home}?overview=1`"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :class="{ 'is-active': route.path === home && !route.query.folder }"
          :ui="{ leadingIcon: 'size-ui-lg' }"
        />
        <UButton
          label="Ask workspace"
          icon="i-lucide-sparkles"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :ui="{ leadingIcon: 'size-ui-lg' }"
          :to="`${home}/ask`"
          :class="{ 'is-active': route.path === `${home}/ask` }"
        />
        <UButton
          label="Members"
          aria-label="Members"
          icon="i-lucide-users"
          color="neutral"
          variant="ghost"
          class="sidebar-link"
          :ui="{ leadingIcon: 'size-ui-lg' }"
          :to="`${home}/members`"
          :class="{ 'is-active': route.path === `${home}/members` }"
        >
          <template #trailing>
            <USkeleton
              v-if="membersLoading"
              aria-hidden="true"
              class="ml-auto h-ui-md w-ui-lg"
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
          :ui="{ leadingIcon: 'size-ui-lg' }"
        />
      </div>
      <DataRetry
        v-if="itemsError || foldersError"
        :feedback-keys="[`workspaces:${workspaceId}:items`, `workspaces:${workspaceId}:folders`]"
        :on-retry="refresh"
      />
      <WorkspaceFavorites :workspace-id="workspaceId" />
      <WorkspaceTree
        v-if="overview"
        :overview="overview"
        :items-loading="itemsLoading"
        :folders-loading="foldersLoading"
        @create-item="createItem"
        @delete-folder="deleteFolder"
        @delete-item="deleteItem"
      />
    </nav>
    <div class="p-ui-md space-y-ui-md">
      <UButton
        v-if="manager"
        label="Invite teammates"
        icon="i-lucide-user-plus"
        color="primary"
        variant="soft"
        size="sm"
        class="w-full justify-start py-ui-sm text-muted hover:text-highlighted"
        :to="`${home}/members#invite`"
      />
      <USeparator class="opacity-75" />
      <div class="flex items-center gap-ui-sm px-ui-xs pb-ui-xs">
        <UAvatar
          :alt="auth.user?.name || auth.user?.email"
          :src="auth.user?.avatar || undefined"
          size="sm"
          class="bg-primary/10 text-primary"
        />
        <div class="flex-1 min-w-ui-zero">
          <p class="text-xs font-semibold text-highlighted truncate">
            {{ auth.user?.name || auth.user?.email }}
          </p><p class="text-xs text-muted capitalize mt-ui-2xs">
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
      v-model:open="deleteItemOpen"
      title="Delete item"
      :description="`“${deletingItem?.title || 'This item'}” will be moved to Trash. You can restore it later.`"
      confirm-label="Delete"
      :on-confirm="confirmDeleteItem"
    />
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete folder"
      :description="`“${deletingFolder?.name || 'This folder'}” and its items will be moved to Trash. You can restore the folder and its contents later.`"
      confirm-label="Delete"
      :on-confirm="confirmDelete"
    />
  </div>
</template>
