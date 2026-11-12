<script setup lang="ts">
import { DEFAULT_FOLDER_ICON } from '#shared/kernel/icons'
import { SerialTaskQueue } from '~/core/async/SerialTaskQueue'
import EntityIcon from '~/components/ui/EntityIcon.vue'
import EntityIconPicker from '~/components/ui/EntityIconPicker.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceState } from '~/features/workspaces/state/useWorkspaceState'
import { useApi } from '~/core/http/useApi'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
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
import type { WorkspaceItem, WorkspaceUpdate } from '#shared/contracts/workspace'
import type { PageItem } from '#shared/contracts/page'

const route = useRoute()
const { workspaceId } = defineProps<{ workspaceId: string }>()
const { data, loading, error, refresh, pagesLoading, foldersLoading, membersLoading, pagesError, foldersError } = useWorkspace(workspaceId)
const { workspaces: workspaceApi } = useApi()
const cache = useWorkspaceState(workspaceId)
const manager = computed(() => data.value?.workspace.role !== 'member')
const directory = useNuxtData<WorkspaceItem[]>(workspaceKeys.directory)
const writes = new SerialTaskQueue()
async function updateWorkspace(input: WorkspaceUpdate) {
  await writes.run(async () => {
    const result = await workspaceApi.update(workspaceId, input)
    cache.updateWorkspace(result.data)
    if (directory.data.value) {
      directory.data.value = directory.data.value.map(item => item.id === result.data.id ? result.data : item)
    }
  })
}
const folder = computed(() => data.value?.folders.find(item => item.id === route.query.folder))
const search = ref('')
const view = ref<'list' | 'grid'>('list')
const selectedFolderId = computed(() => typeof route.query.folder === 'string' ? route.query.folder : null)
const scopedPages = computed(() => data.value?.pages.filter(page => !selectedFolderId.value || page.folderId === selectedFolderId.value) || [])
const pages = computed(() => scopedPages.value.filter(page => page.title.toLowerCase().includes(search.value.toLowerCase())))
const { creatingPage, createPage } = usePageCreation(workspaceId)
const { updateFolder } = useWorkspaceFolders(workspaceId)
const columns: TableColumn<PageItem>[] = [{ accessorKey: 'title', header: 'Page' }, { id: 'location', header: 'Location' }, { accessorKey: 'updatedAt', header: 'Last edited' }]
const breadcrumbs = computed(() => [
  { label: data.value?.workspace.name || 'Workspace', emoji: data.value?.workspace.icon, icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
  ...(folder.value ? [{ label: folder.value.name, emoji: folder.value.icon || DEFAULT_FOLDER_ICON }] : [])
])
</script>

<template>
  <div
    class="app-enter pb-14"
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
      <UAlert
        v-else-if="error"
        title="Unable to load workspace"
        :description="errorMessage(error)"
        color="error"
        :actions="[{ label: 'Retry', onClick: refresh }]"
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
            :readonly="!folder && !manager"
            :on-save="icon => folder ? updateFolder(folder.id, { icon }) : updateWorkspace({ icon })"
          />
        </template>
        <template
          v-if="folder || manager"
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
            v-if="folder || manager"
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
            class="h-5 w-28"
          />
          <UAvatarGroup
            v-else
            size="2xs"
            :max="4"
          >
            <UAvatar
              v-for="member in data.members"
              :key="member.userId"
              :alt="member.name || member.email"
              :src="member.avatar || undefined"
              class="bg-primary/10 text-primary ring-default"
            />
          </UAvatarGroup>
          <span v-if="!membersLoading">{{ data.members.length }} {{ data.members.length === 1 ? 'member' : 'members' }}</span><span class="text-dimmed">·</span><USkeleton
            v-if="pagesLoading"
            class="h-4 w-12"
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
        class="space-y-3"
        aria-label="Workspace folders"
      >
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-folder-open"
            class="size-4 text-muted"
          /><h2 class="text-sm font-semibold">
            Folders
          </h2>
        </div>
        <DataSkeleton
          v-if="foldersLoading"
          label="Loading workspace folders"
          :rows="2"
        />
        <UAlert
          v-else-if="foldersError"
          title="Unable to load folders"
          color="error"
          :actions="[{ label: 'Retry', onClick: refresh }]"
        />
        <div
          v-else
          class="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1"
        >
          <NuxtLink
            v-for="item in data.folders"
            :key="item.id"
            :to="`/workspaces/${workspaceId}?folder=${item.id}`"
            class="group folder-link focus-visible:outline-2 focus-visible:outline-primary"
          >
            <EntityIcon
              :value="item.icon || DEFAULT_FOLDER_ICON"
              class="size-5 text-xl text-muted"
            />
            <div class="min-w-0 flex-1">
              <h3 class="font-medium text-sm truncate">{{ item.name }}</h3>
              <USkeleton
                v-if="pagesLoading"
                class="h-3 w-12 mt-1"
              /><p
                v-else
                class="text-xs text-muted mt-1"
              >{{ formatPageCount(data.pages.filter(page => page.folderId === item.id).length) }}</p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5 text-dimmed group-hover:text-toned transition-colors"
            />
          </NuxtLink>
        </div>
      </section>
      <section
        v-if="data"
        class="space-y-4"
        aria-label="Workspace pages"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-files"
              class="size-4 text-muted"
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
          <div class="flex items-center gap-2">
            <UInput
              v-model="search"
              placeholder="Search pages…"
              aria-label="Search workspace pages"
              icon="i-lucide-search"
              size="sm"
              class="w-40 sm:w-48"
            />
            <div class="flex items-center gap-0.5 rounded-[5px] border border-muted bg-muted/70 p-0.5">
              <UTooltip
                v-for="mode in (['list', 'grid'] as const)"
                :key="mode"
                :text="`${mode} view`"
              >
                <UButton
                  :icon="mode === 'list' ? 'i-lucide-list' : 'i-lucide-layout-grid'"
                  :aria-label="`${mode} view`"
                  :aria-pressed="view === mode"
                  :variant="view === mode ? 'outline' : 'ghost'"
                  color="neutral"
                  size="xs"
                  @click="view = mode"
                />
              </UTooltip>
            </div>
          </div>
        </div>
        <DataSkeleton
          v-if="pagesLoading"
          label="Loading workspace pages"
        />
        <UAlert
          v-else-if="pagesError"
          title="Unable to load pages"
          color="error"
          :actions="[{ label: 'Retry', onClick: refresh }]"
        />
        <UTable
          v-else-if="pages.length && view === 'list'"
          :data="pages"
          :columns="columns"
          class="workspace-page-table"
          :ui="{ root: 'border-t border-muted', thead: 'bg-transparent', separator: 'bg-(--ui-border-muted)', tbody: 'divide-y divide-muted', th: 'text-xs font-normal text-muted py-3 border-muted', td: 'py-3.5 border-muted', tr: 'hover:bg-muted/65 transition-colors' }"
        >
          <template #title-cell="{ row }">
            <UButton
              :to="`/workspaces/${workspaceId}/pages/${row.original.id}`"
              color="neutral"
              variant="link"
              class="px-0 font-medium text-highlighted max-w-60 sm:max-w-80"
            >
              <template #leading>
                <EntityIcon
                  :value="row.original.icon"
                  fallback="i-lucide-file"
                  class="size-5 text-xl mr-1"
                />
              </template><span class="truncate">{{ row.original.title }}</span>
            </UButton>
          </template>
          <template #location-cell="{ row }">
            <span class="inline-flex items-center gap-1.5 text-xs text-muted"><EntityIcon
              :value="row.original.folderId ? data.folders.find(item => item.id === row.original.folderId)?.icon || DEFAULT_FOLDER_ICON : data.workspace.icon"
              :fallback="row.original.folderId ? undefined : 'i-lucide-panels-top-left'"
              class="size-3.5 text-sm"
            />{{ data.folders.find(item => item.id === row.original.folderId)?.name || 'Workspace' }}</span>
          </template>
          <template #updatedAt-cell="{ row }">
            <span class="text-xs text-muted whitespace-nowrap">{{ formatRelativeTime(row.original.updatedAt) }}</span>
          </template>
        </UTable>
        <div
          v-else-if="pages.length"
          class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <NuxtLink
            v-for="page in pages"
            :key="page.id"
            :to="`/workspaces/${workspaceId}/pages/${page.id}`"
            class="group"
          >
            <UCard
              class="workspace-card surface-card h-full"
              :ui="{ body: 'p-5 sm:p-5' }"
            ><EntityIcon
              :value="page.icon"
              fallback="i-lucide-file"
              class="size-8 text-3xl"
            /><h3 class="font-semibold text-sm mt-4 truncate">{{ page.title }}</h3><p class="text-xs text-muted mt-5">Edited {{ formatRelativeTime(page.updatedAt) }}</p></UCard>
          </NuxtLink>
        </div>
        <UEmpty
          v-else
          variant="naked"
          :icon="search ? 'i-lucide-search' : 'i-lucide-file-pen-line'"
          :title="search ? 'No pages found' : 'Start with a blank page'"
          :description="search ? 'Try another title or clear your search.' : 'A quick thought, a project plan, a shared idea. It all starts here.'"
          class="bg-default py-14"
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
              v-else
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
</template>
