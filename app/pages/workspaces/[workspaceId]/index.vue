<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PageItem } from '#shared/types/page'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { data } = await useWorkspace(workspaceId)
const folder = computed(() => data.value?.folders.find(item => item.id === route.query.folder))
const search = ref('')
const view = ref<'list' | 'grid'>('list')
const scopedPages = computed(() => data.value?.pages.filter(page => !folder.value || page.folderId === folder.value.id) || [])
const pages = computed(() => scopedPages.value.filter(page => page.title.toLowerCase().includes(search.value.toLowerCase())))
const { creatingPage, createPage } = usePageCreation(workspaceId)
const { renameFolder } = useWorkspaceFolders(workspaceId)
const columns: TableColumn<PageItem>[] = [{ accessorKey: 'title', header: 'Page' }, { id: 'location', header: 'Location' }, { accessorKey: 'updatedAt', header: 'Last edited' }]
const breadcrumbs = computed(() => [
  { label: data.value?.workspace.name || 'Workspace', icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
  ...(folder.value ? [{ label: folder.value.name, icon: 'i-lucide-folder' }] : [])
])
</script>

<template>
  <div
    v-if="data"
    class="app-enter pb-14"
  >
    <AppHeader>
      <template #left>
        <WorkspacesBreadcrumbs :items="breadcrumbs" />
      </template>
    </AppHeader>
    <WorkspacesContent>
      <WorkspacesHeading
        :title="folder?.name || data.workspace.name"
        :description="folder ? 'Pages organized in this folder.' : 'Your team’s pages, projects, and shared knowledge.'"
      >
        <template #icon>
          <UIcon
            :name="folder ? 'i-lucide-folder' : 'i-lucide-panels-top-left'"
            class="size-7"
          />
        </template>
        <template
          v-if="folder"
          #title
        >
          <InlineName
            :key="folder.id"
            :value="folder.name"
            label="Folder name"
            fallback="Untitled folder"
            :maxlength="120"
            :on-save="name => renameFolder(folder!.id, name)"
          />
        </template>
        <template #metadata>
          <UAvatarGroup
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
          <span>{{ data.members.length }} {{ data.members.length === 1 ? 'member' : 'members' }}</span><span class="text-dimmed">·</span><span>{{ formatPageCount(scopedPages.length) }}</span><UBadge
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
      </WorkspacesHeading>
      <section
        v-if="!folder && data.folders.length"
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
        <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1">
          <NuxtLink
            v-for="item in data.folders"
            :key="item.id"
            :to="`/workspaces/${workspaceId}?folder=${item.id}`"
            class="group folder-link focus-visible:outline-2 focus-visible:outline-primary"
          >
            <UIcon
              name="i-lucide-folder"
              class="size-5 shrink-0 text-muted"
            />
            <div class="min-w-0 flex-1">
              <h3 class="font-medium text-sm truncate">{{ item.name }}</h3>
              <p class="text-xs text-muted mt-1">{{ formatPageCount(data.pages.filter(page => page.folderId === item.id).length) }}</p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5 text-dimmed group-hover:text-toned transition-colors"
            />
          </NuxtLink>
        </div>
      </section>
      <section
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
        <UTable
          v-if="pages.length && view === 'list'"
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
                <span class="text-xl mr-1">{{ row.original.icon || '📄' }}</span>
              </template><span class="truncate">{{ row.original.title }}</span>
            </UButton>
          </template>
          <template #location-cell="{ row }">
            <span class="inline-flex items-center gap-1.5 text-xs text-muted"><UIcon
              :name="row.original.folderId ? 'i-lucide-folder' : 'i-lucide-panels-top-left'"
              class="size-3.5"
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
            ><span class="text-3xl">{{ page.icon || '📄' }}</span><h3 class="font-semibold text-sm mt-4 truncate">{{ page.title }}</h3><p class="text-xs text-muted mt-5">Edited {{ formatRelativeTime(page.updatedAt) }}</p></UCard>
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
    </WorkspacesContent>
  </div>
</template>
