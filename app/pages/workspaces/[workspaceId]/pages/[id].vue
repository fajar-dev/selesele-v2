<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import PageReader from '~/features/pages/components/PageReader.vue'
import PageEditor from '~/features/pages/components/PageEditor.vue'
import { usePageDocument } from '~/features/pages/composables/usePageDocument'

definePageMeta({ layout: 'workspace', key: route => String(route.params.id) })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { page, overview, error, updated, loading, refresh } = usePageDocument(workspaceId, String(route.params.id))

useFeedbackToast(() => !loading.value && !page.value ? error.value || 'This page is unavailable or you no longer have access.' : null, { key: `page-open:${String(route.params.id)}`, title: 'Unable to open page', retry: refresh })
</script>

<template>
  <PageReader
    v-if="page && overview && (overview.workspace.archivedAt || page.accessLevel !== 'edit')"
    :page="page"
    :workspace-name="overview.workspace.name"
    :archived="!!overview.workspace.archivedAt"
  />
  <PageEditor
    v-else-if="page && overview"
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
      class="mt-ui-5xl"
      :rows="7"
    />
  </div>
  <div
    v-else
    class="p-ui-4xl space-y-ui-lg"
  >
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
