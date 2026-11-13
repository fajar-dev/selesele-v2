<script setup lang="ts">
import WorkspaceFeaturePage from '~/features/workspaces/components/WorkspaceFeaturePage.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data: overview } = useWorkspace(workspaceId)
const api = useApi().library
const query = useLazyAsyncData(`workspace-templates:${workspaceId}`, async () => (await api.workspaceTemplates(workspaceId)).data, { server: false, default: () => [] })
const builtins = useLazyAsyncData('library:templates', async () => (await api.templates()).data, { server: false, default: () => [] })
const manager = computed(() => !!overview.value && ['owner', 'admin'].includes(overview.value.workspace.role) && !overview.value.workspace.archivedAt)
const writable = computed(() => !!overview.value && !overview.value.workspace.archivedAt && allowsWorkspaceAction(overview.value.workspace.role, overview.value.workspace.settings, 'createPages'))
const busy = ref(''), deleting = ref<string | null>(null), toast = useToast()
const removalOpen = computed({ get: () => !!deleting.value, set: (value) => {
  if (!value) {
    deleting.value = null
  }
} })
useWorkspaceEvents(workspaceId, () => {
  void query.refresh()
})
useFeedbackToast(query.error, { key: `workspace-templates:${workspaceId}`, title: 'Unable to load workspace templates', recovered: () => query.status.value === 'success', retry: () => query.refresh() })
useFeedbackToast(builtins.error, { key: 'library:templates', title: 'Unable to load templates', recovered: () => builtins.status.value === 'success', retry: () => builtins.refresh() })
async function create(id: string) {
  if (busy.value) {
    return
  }
  busy.value = id
  try {
    const page = (await api.createTemplate(workspaceId, id, null)).data
    await navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)
  } catch (cause) {
    toast.add({ title: 'Unable to create page', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = ''
  }
}
async function remove() {
  if (deleting.value) {
    await api.removeTemplate(workspaceId, deleting.value)
    await query.refresh()
  }
}
</script>

<template>
  <WorkspaceFeaturePage
    :workspace-id="workspaceId"
    :workspace="overview?.workspace"
    title="Templates"
    description="Reusable starting points. Save a page as a workspace template from its actions menu."
    icon="i-lucide-layout-template"
  >
    <section class="space-y-ui-lg">
      <h2 class="text-base font-semibold">
        Workspace templates
      </h2><p class="text-xs text-muted">
        Only templates whose source pages you can access are shown. Saving captures a snapshot; later page edits do not change it.
      </p>
      <DataSkeleton
        v-if="query.status.value === 'pending'"
        label="Loading workspace templates"
      />
      <DataRetry
        v-else-if="query.error.value"
        :feedback-keys="[`workspace-templates:${workspaceId}`]"
        :on-retry="() => query.refresh()"
      />
      <div
        v-else
        class="divide-y divide-muted border-t border-muted"
      >
        <div
          v-for="template in query.data.value"
          :key="template.id"
          class="flex items-center gap-ui-lg py-ui-lg"
        >
          <span class="text-xl shrink-0">{{ template.icon }}</span><div class="min-w-ui-zero flex-1">
            <h3 class="text-sm font-medium truncate">
              {{ template.title }}
            </h3><p class="text-xs text-muted mt-ui-xs line-clamp-2">
              {{ template.description }}
            </p>
          </div>
          <UButton
            v-if="writable"
            label="Use template"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="busy === template.id"
            :disabled="!!busy"
            @click="create(template.id)"
          /><UButton
            v-if="manager"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :aria-label="`Delete template ${template.title}`"
            @click="deleting = template.id"
          />
        </div>
        <p
          v-if="!query.data.value.length"
          class="text-sm text-muted py-ui-3xl"
        >
          No workspace templates yet.
        </p>
      </div>
    </section>
    <section class="space-y-ui-lg">
      <h2 class="text-base font-semibold">
        Built-in templates
      </h2>
      <DataSkeleton
        v-if="builtins.status.value === 'pending'"
        label="Loading built-in templates"
      />
      <DataRetry
        v-else-if="builtins.error.value"
        :feedback-keys="['library:templates']"
        :on-retry="() => builtins.refresh()"
      />
      <div
        v-else
        class="divide-y divide-muted border-t border-muted"
      >
        <div
          v-for="template in builtins.data.value"
          :key="template.id"
          class="flex items-center gap-ui-lg py-ui-lg"
        >
          <span class="text-xl shrink-0">{{ template.icon }}</span><div class="min-w-ui-zero flex-1">
            <h3 class="text-sm font-medium">
              {{ template.title }}
            </h3><p class="text-xs text-muted mt-ui-xs">
              {{ template.description }}
            </p>
          </div><UButton
            v-if="writable"
            label="Use template"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="busy === template.id"
            :disabled="!!busy"
            @click="create(template.id)"
          />
        </div>
      </div>
    </section>
    <ConfirmationDialog
      v-model:open="removalOpen"
      title="Delete template"
      description="This removes the reusable template. Its source page remains available."
      :on-confirm="remove"
    />
  </WorkspaceFeaturePage>
</template>
