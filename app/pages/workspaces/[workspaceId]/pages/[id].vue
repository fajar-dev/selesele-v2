<script setup lang="ts">
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import PageEditor from '~/features/pages/components/PageEditor.vue'
import { usePageDocument } from '~/features/pages/composables/usePageDocument'

definePageMeta({ layout: 'workspace', key: route => String(route.params.id) })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { page, overview, error, updated, loading, refresh } = usePageDocument(workspaceId, String(route.params.id))
</script>

<template>
  <PageEditor
    v-if="page"
    :page="page"
    :members="overview?.members || []"
    :folders="overview?.folders || []"
    :workspace-name="overview?.workspace.name || 'Workspace'"
    :workspace-icon="overview?.workspace.icon"
    @updated="updated"
  />
  <div
    v-else-if="loading"
    class="workspace-content workspace-content-start"
  >
    <DataSkeleton
      kind="heading"
      label="Loading page"
    /><DataSkeleton
      kind="editor"
      class="mt-10"
      :rows="7"
    />
  </div>
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
      label="Retry"
      color="neutral"
      variant="soft"
      @click="refresh()"
    />
    <UButton
      label="Workspace home"
      :to="`/workspaces/${workspaceId}`"
      color="neutral"
    />
  </div>
</template>
