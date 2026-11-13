<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DocumentReader from '~/features/items/components/DocumentReader.vue'
import DocumentEditor from '~/features/items/components/DocumentEditor.vue'
import CanvasScreen from '~/features/canvases/components/CanvasScreen.vue'
import { useContentItem } from '~/features/items/composables/useContentItem'

definePageMeta({ layout: 'workspace', key: route => String(route.params.id) })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { item, overview, error, updated, loading, refresh } = useContentItem(workspaceId, String(route.params.id))
useFeedbackToast(() => !loading.value && !item.value ? error.value || 'This item is unavailable or you no longer have access.' : null, { key: `item-open:${String(route.params.id)}`, title: 'Unable to open item', retry: refresh })
</script>

<template>
  <CanvasScreen
    v-if="item && overview && item.kind !== 'document'"
    :item="item"
    :overview="overview"
    @updated="updated"
  />
  <DocumentReader
    v-else-if="item && overview && (overview.workspace.archivedAt || item.archivedAt || item.accessLevel !== 'edit')"
    :item="item"
    :workspace-name="overview.workspace.name"
    :archived="!!overview.workspace.archivedAt || !!item.archivedAt"
  />
  <DocumentEditor
    v-else-if="item && overview"
    :item="item"
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
      label="Loading item"
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
