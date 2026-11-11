<script setup lang="ts">
import type { PageItem } from '#shared/types/page'
import { pageService } from '~/services/pageService'

definePageMeta({ layout: 'workspace', key: route => String(route.params.id) })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const id = String(route.params.id)
const { data: overview } = await useWorkspace(workspaceId)
const { data: page, error } = await useAsyncData(`page:${id}`, async () => {
  const response = await pageService.get(id)
  if (response.data.workspaceId !== workspaceId) {
    throw createError({ statusCode: 404, message: 'Page not found in this workspace' })
  }
  return response.data
})
watch(() => overview.value?.pages.find(item => item.id === id), (current) => {
  if (current && page.value) {
    page.value = current
  }
})
async function updated(next: PageItem) {
  page.value = next
  await refreshWorkspace(workspaceId)
}
</script>

<template>
  <PagesEditor
    v-if="page && overview"
    :page="page"
    :members="overview.members"
    :folders="overview.folders"
    :workspace-name="overview.workspace.name"
    @updated="updated"
  />
  <div
    v-else
    class="p-8 space-y-4"
  >
    <UAlert
      title="Unable to open page"
      :description="error ? errorMessage(error) : 'Page not found'"
      color="error"
    />
    <UButton
      label="Workspace home"
      :to="`/workspaces/${workspaceId}`"
      color="neutral"
    />
  </div>
</template>
