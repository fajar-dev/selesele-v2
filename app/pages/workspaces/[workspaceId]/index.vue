<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { data } = await useWorkspace(workspaceId)
const folder = computed(() => data.value?.folders.find(item => item.id === route.query.folder))
const pages = computed(() => data.value?.pages.filter(page => !folder.value || page.folderId === folder.value.id) || [])
const createOpen = ref(false)
async function created(page: { id: string }) {
  await refreshWorkspace(workspaceId)
  await navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)
}
</script>

<template>
  <div v-if="data">
    <AppHeader>
      <template #left>
        <span class="text-sm text-muted truncate">{{ data.workspace.name }}</span>
      </template>
    </AppHeader>
    <section class="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-4xl">{{ folder ? '📁' : data.workspace.icon }}</span>
          <h1 class="text-3xl tracking-tight font-semibold mt-4">
            {{ folder?.name || data.workspace.name }}
          </h1>
          <p class="text-sm text-muted mt-2">
            {{ folder ? 'Pages in this folder' : `${data.members.length} members · ${data.folders.length} folders · ${data.pages.length} pages` }}
          </p>
        </div>
        <UButton
          label="New page"
          icon="i-lucide-plus"
          color="neutral"
          @click="createOpen = true"
        />
      </div>
      <div
        v-if="!folder && data.folders.length"
        class="grid sm:grid-cols-3 gap-3"
      >
        <NuxtLink
          v-for="item in data.folders"
          :key="item.id"
          :to="`/workspaces/${workspaceId}?folder=${item.id}`"
          class="flex items-center gap-3 rounded-lg border border-default p-4 hover:bg-elevated/50"
        ><UIcon
          name="i-lucide-folder"
          class="size-5 text-muted"
        /><span class="font-medium text-sm truncate">{{ item.name }}</span></NuxtLink>
      </div>
      <div>
        <h2 class="font-semibold mb-3">
          {{ folder ? 'Pages' : 'All pages' }}
        </h2>
        <div
          v-if="pages.length"
          class="divide-y divide-default border-y border-default"
        >
          <NuxtLink
            v-for="page in pages"
            :key="page.id"
            :to="`/workspaces/${workspaceId}/pages/${page.id}`"
            class="flex items-center gap-3 py-4 px-2 rounded hover:bg-elevated/50"
          >
            <span class="text-xl">{{ page.icon || '📄' }}</span>
            <div class="flex-1 min-w-0"><p class="font-medium truncate">{{ page.title }}</p><p
              v-if="page.description"
              class="text-xs text-muted truncate mt-1"
            >{{ page.description }}</p></div>
            <span class="text-xs text-muted hidden sm:block">{{ page.folderId ? data.folders.find(item => item.id === page.folderId)?.name : 'Workspace root' }}</span>
            <span class="text-xs text-dimmed hidden sm:block">{{ formatRelativeTime(page.updatedAt) }}</span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 text-dimmed"
            />
          </NuxtLink>
        </div>
        <div
          v-else
          class="border border-dashed border-default rounded-xl text-center py-16"
        >
          <UIcon
            name="i-lucide-file-plus-2"
            class="size-10 text-dimmed"
          />
          <h3 class="font-medium mt-3">
            Start with a blank page
          </h3>
          <p class="text-sm text-muted mt-2 mb-4">
            Write a note, plan a project, or share an idea with your workspace.
          </p>
          <UButton
            label="Create a page"
            color="neutral"
            variant="soft"
            @click="createOpen = true"
          />
        </div>
      </div>
    </section>
    <PagesFormModal
      v-model:open="createOpen"
      :workspace-id="workspaceId"
      :folders="data.folders"
      :default-folder-id="folder?.id || null"
      @success="created"
    />
  </div>
</template>
