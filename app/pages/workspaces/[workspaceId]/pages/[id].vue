<script setup lang="ts">
import PageEditor from '~/features/pages/components/PageEditor.vue'
import { usePageDocument } from '~/features/pages/composables/usePageDocument'

definePageMeta({ layout: 'workspace', key: route => String(route.params.id) })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { page, overview, error, updated, ready } = usePageDocument(workspaceId, String(route.params.id))
await ready
</script>

<template>
  <PageEditor
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
