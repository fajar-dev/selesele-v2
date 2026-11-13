<script setup lang="ts">
import DataRetry from '~/components/ui/DataRetry.vue'
import ResourceAccessPanel from '~/features/access/components/ResourceAccessPanel.vue'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'
import { DEFAULT_FOLDER_ICON } from '#shared/kernel/icons'
import LayoutToggle from '~/components/ui/LayoutToggle.vue'
import EntityIcon from '~/components/ui/EntityIcon.vue'
import EntityIconPicker from '~/components/ui/EntityIconPicker.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceActions } from '~/features/workspaces/composables/useWorkspaceActions'
import AppHeader from '~/components/shell/AppHeader.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import { usePageCreation } from '~/features/pages/composables/usePageCreation'
import { useWorkspaceFolders } from '~/features/workspaces/composables/useWorkspaceFolders'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { formatPageCount } from '~/features/workspaces/utils/workspacePresentation'
import type { TableColumn } from '@nuxt/ui'
import type { PageItem } from '#shared/contracts/page'

const route = useRoute()
const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data, loading, error, refresh, pagesLoading, foldersLoading, membersLoading, pagesError, foldersError } = useWorkspace(workspaceId)
const { save: updateWorkspace } = useWorkspaceActions(workspaceId)
const manager = computed(() => !data.value?.workspace.archivedAt && (data.value?.workspace.role === 'owner' || data.value?.workspace.role === 'admin'))
const canCreate = computed(() => (!folder.value || folder.value.accessLevel === 'edit') && !!data.value && !data.value.workspace.archivedAt && allowsWorkspaceAction(data.value.workspace.role, data.value.workspace.settings, 'createPages'))
const folder = computed(() => data.value?.folders.find(item => item.id === route.query.folder))
const accessOpen = ref(false)
const canEditFolder = computed(() => folder.value?.accessLevel === 'edit' && !data.value?.workspace.archivedAt)
const search = ref('')
const view = ref<'list' | 'grid'>('list')
const selectedFolderId = computed(() => typeof route.query.folder === 'string' ? route.query.folder : null)
const scopedPages = computed(() => data.value?.pages.filter(page => !page.archivedAt && (!selectedFolderId.value || page.folderId === selectedFolderId.value)) || [])
const pages = computed(() => scopedPages.value.filter(page => page.title.toLowerCase().includes(search.value.toLowerCase())))
const { creatingPage, createPage } = usePageCreation(workspaceId)
const { updateFolder } = useWorkspaceFolders(workspaceId)
const columns: TableColumn<PageItem>[] = [{ accessorKey: 'title', header: 'Page' }, { id: 'location', header: 'Location' }, { accessorKey: 'updatedAt', header: 'Last edited' }]
const breadcrumbs = computed(() => [
  { label: data.value?.workspace.name || 'Workspace', emoji: data.value?.workspace.icon, icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
  ...(folder.value ? [{ label: folder.value.name, emoji: folder.value.icon || DEFAULT_FOLDER_ICON }] : [])
])
watchEffect(() => {
  const home = data.value?.workspace.settings.homePageId
  if (home && !route.query.folder && !route.query.overview && data.value?.pages.some(page => page.id === home)) {
    void navigateTo(`/workspaces/${workspaceId}/pages/${home}`, { replace: true })
  }
})
</script>

<template>
  <div
    class="app-enter pb-ui-7xl"
  >
    <AppHeader>
      <template #left>
        <PageBreadcrumbs :items="breadcrumbs" />
      </template>
    </AppHeader>
    <PageContent>
      <DataSkeleton
        v-if="loading || (selectedFolderId && foldersLoading)"
        kind="heading"
        label="Loading workspace heading"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`workspaces:${workspaceId}`]"
        :on-retry="refresh"
      />
      <PageHeading
        v-else-if="data"
        :title="folder?.name || data.workspace.name"
      >
        <template #icon>
          <EntityIconPicker
            :key="folder?.id || workspaceId"
            :value="folder ? folder.icon || DEFAULT_FOLDER_ICON : data.workspace.icon"
            :label="folder ? 'Choose folder icon' : 'Choose workspace icon'"
            :fallback="folder ? undefined : 'i-lucide-panels-top-left'"
            :readonly="!!data.workspace.archivedAt || (folder ? !canEditFolder : !manager)"
            :on-save="icon => folder ? updateFolder(folder.id, { icon }) : updateWorkspace({ icon })"
          />
        </template>
        <template
          v-if="folder ? canEditFolder : manager"
          #title
        >
          <InlineTextField
            :key="folder?.id || workspaceId"
            :value="folder?.name || data.workspace.name"
            :label="folder ? 'Folder name' : 'Workspace name'"
            :fallback="folder ? 'Untitled folder' : 'Untitled workspace'"
            :maxlength="120"
            :autofocus="folder ? folder.name === 'Untitled folder' : data.workspace.name === 'Untitled workspace'"
            :on-save="name => folder ? updateFolder(folder.id, { name }) : updateWorkspace({ name })"
          />
        </template>
        <template #description>
          <InlineTextField
            v-if="folder ? canEditFolder : manager"
            :key="`description:${folder?.id || workspaceId}`"
            :value="folder?.description ?? data.workspace.description"
            :label="folder ? 'Folder description' : 'Workspace description'"
            placeholder="Add a description…"
            :maxlength="2000"
            :on-save="description => folder ? updateFolder(folder.id, { description }) : updateWorkspace({ description })"
          />
          <p v-else>
            {{ data.workspace.description }}
          </p>
        </template>
        <template #metadata>
          <USkeleton
            v-if="membersLoading"
            aria-hidden="true"
            class="h-ui-xl w-ui-11xl"
          />
          <UAvatarGroup
            v-else
            size="2xs"
            :max="4"
          >
            <UAvatar
              v-for="member in data.members"
              :key="member.id"
              :alt="member.name || member.email"
              :src="member.avatar || undefined"
              class="bg-primary/10 text-primary ring-default"
            />
          </UAvatarGroup>
          <span v-if="!membersLoading">{{ data.members.length }} {{ data.members.length === 1 ? 'member' : 'members' }}</span><span class="text-dimmed">·</span><USkeleton
            v-if="pagesLoading"
            aria-hidden="true"
            class="h-ui-lg w-ui-6xl"
          /><span v-else>{{ formatPageCount(scopedPages.length) }}</span><UBadge
            color="neutral"
            variant="soft"
            size="sm"
            class="capitalize"
          >
            {{ data.workspace.role }}
          </UBadge>
        </template>
        <template #actions>
          <UButton
            v-if="folder?.canManageAccess"
            label="Manage access"
            icon="i-lucide-shield-check"
            variant="ghost"
            color="neutral"
            @click="accessOpen = true"
          />
          <UButton
            v-if="canCreate"
            label="New page"
            icon="i-lucide-plus"
            color="primary"
            :loading="creatingPage"
            @click="createPage(folder?.id || null)"
          />
        </template>
      </PageHeading>
      <section
        v-if="data && !folder"
        class="space-y-ui-md"
        aria-label="Workspace folders"
      >
        <div class="flex items-center gap-ui-sm">
          <UIcon
            name="i-lucide-folder-open"
            class="size-ui-lg text-muted"
          /><h2 class="text-sm font-semibold">
            Folders
          </h2>
        </div>
        <DataSkeleton
          v-if="foldersLoading"
          label="Loading workspace folders"
          :rows="2"
        />
        <DataRetry
          v-else-if="foldersError"
          :feedback-keys="[`workspaces:${workspaceId}:folders`]"
          :on-retry="refresh"
        />
        <div
          v-else
          class="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-ui-2xl gap-y-ui-xs"
        >
          <NuxtLink
            v-for="item in data.folders"
            :key="item.id"
            :to="`/workspaces/${workspaceId}?folder=${item.id}`"
            class="group folder-link focus-visible:outline-2 focus-visible:outline-primary"
          >
            <EntityIcon
              :value="item.icon || DEFAULT_FOLDER_ICON"
              class="size-ui-xl text-xl text-muted"
            />
            <div class="min-w-ui-zero flex-1">
              <h3 class="font-medium text-sm truncate">{{ item.name }}</h3>
              <USkeleton
                v-if="pagesLoading"
                aria-hidden="true"
                class="h-ui-md w-ui-6xl mt-ui-xs"
              /><p
                v-else
                class="text-xs text-muted mt-ui-xs"
              >{{ formatPageCount(data.pages.filter(page => page.folderId === item.id).length) }}</p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-ui-md text-dimmed group-hover:text-toned transition-colors"
            />
          </NuxtLink>
        </div>
      </section>
      <section
        v-if="data"
        class="space-y-ui-lg"
        aria-label="Workspace pages"
      >
        <div class="flex flex-wrap items-center justify-between gap-ui-md">
          <div class="flex items-center gap-ui-sm">
            <UIcon
              name="i-lucide-files"
              class="size-ui-lg text-muted"
            /><h2 class="text-sm font-semibold">
              {{ folder ? 'Pages in this folder' : 'All pages' }}
            </h2><UBadge
              color="neutral"
              variant="soft"
              size="sm"
            >
              {{ pages.length }}
            </UBadge>
          </div>
          <div class="flex items-center gap-ui-sm">
            <UInput
              v-model="search"
              placeholder="Search pages…"
              aria-label="Search workspace pages"
              icon="i-lucide-search"
              size="sm"
              class="w-ui-13xl sm:w-ui-14xl"
            />
            <LayoutToggle
              v-model="view"
              label="Page layout"
            />
          </div>
        </div>
        <DataSkeleton
          v-if="pagesLoading"
          label="Loading workspace pages"
        />
        <DataRetry
          v-else-if="pagesError"
          :feedback-keys="[`workspaces:${workspaceId}:pages`]"
          :on-retry="refresh"
        />
        <UTable
          v-else-if="pages.length && view === 'list'"
          :data="pages"
          :columns="columns"
          class="workspace-page-table"
          :ui="{ root: 'border-t border-muted', thead: 'bg-transparent', separator: 'bg-(--ui-border-muted)', tbody: 'divide-y divide-muted', th: 'text-xs font-normal text-muted py-ui-md border-muted', td: 'py-ui-md border-muted', tr: 'hover:bg-muted/65 transition-colors' }"
        >
          <template #title-cell="{ row }">
            <UButton
              :to="`/workspaces/${workspaceId}/pages/${row.original.id}`"
              color="neutral"
              variant="link"
              class="px-ui-zero font-medium text-highlighted max-w-ui-15xl sm:max-w-ui-18xl"
            >
              <template #leading>
                <EntityIcon
                  :value="row.original.icon"
                  fallback="i-lucide-file"
                  class="size-ui-xl text-xl mr-ui-xs"
                />
              </template><span class="truncate">{{ row.original.title }}</span>
            </UButton>
          </template>
          <template #location-cell="{ row }">
            <span class="inline-flex items-center gap-ui-xs text-xs text-muted"><EntityIcon
              :value="row.original.folderId ? data.folders.find(item => item.id === row.original.folderId)?.icon || DEFAULT_FOLDER_ICON : data.workspace.icon"
              :fallback="row.original.folderId ? undefined : 'i-lucide-panels-top-left'"
              class="size-ui-md text-sm"
            />{{ data.folders.find(item => item.id === row.original.folderId)?.name || 'Workspace' }}</span>
          </template>
          <template #updatedAt-cell="{ row }">
            <span class="text-xs text-muted whitespace-nowrap">{{ formatRelativeTime(row.original.updatedAt) }}</span>
          </template>
        </UTable>
        <div
          v-else-if="pages.length"
          class="grid sm:grid-cols-2 xl:grid-cols-3 gap-ui-lg"
        >
          <NuxtLink
            v-for="page in pages"
            :key="page.id"
            :to="`/workspaces/${workspaceId}/pages/${page.id}`"
            class="group"
          >
            <UCard
              class="workspace-card surface-card h-full"
              :ui="{ body: 'p-ui-xl sm:p-ui-xl' }"
            ><EntityIcon
              :value="page.icon"
              fallback="i-lucide-file"
              class="size-ui-4xl text-3xl"
            /><h3 class="font-semibold text-sm mt-ui-lg truncate">{{ page.title }}</h3><p class="text-xs text-muted mt-ui-xl">Edited {{ formatRelativeTime(page.updatedAt) }}</p></UCard>
          </NuxtLink>
        </div>
        <UEmpty
          v-else
          variant="naked"
          :icon="search ? 'i-lucide-search' : 'i-lucide-file-pen-line'"
          :title="search ? 'No pages found' : 'Start with a blank page'"
          :description="search ? 'Try another title or clear your search.' : 'A quick thought, a project plan, a shared idea. It all starts here.'"
          class="bg-default py-ui-7xl"
          :ui="{ avatar: 'bg-transparent text-muted ring-0', title: 'text-base', description: 'max-w-sm' }"
        >
          <template #actions>
            <UButton
              v-if="search"
              label="Clear search"
              color="neutral"
              variant="soft"
              @click="search = ''"
            /><UButton
              v-else-if="canCreate"
              label="Create a page"
              icon="i-lucide-plus"
              color="primary"
              :loading="creatingPage"
              @click="createPage(folder?.id || null)"
            />
          </template>
        </UEmpty>
      </section>
    </PageContent>
  </div>
  <ResourceAccessPanel
    v-if="accessOpen && folder"
    :workspace-id="workspaceId"
    kind="folder"
    :resource-id="folder.id"
    @close="accessOpen = false"
  />
</template>
