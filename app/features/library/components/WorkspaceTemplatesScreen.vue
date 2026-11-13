<script setup lang="ts">
import WorkspaceFeatureScreen from '~/features/workspaces/components/WorkspaceFeatureScreen.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useWorkspaceEvents } from '~/features/workspaces/composables/useWorkspaceEvents'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import ItemTemplateCard from './ItemTemplateCard.vue'
import { itemKinds, itemTypeLabels } from '#shared/kernel/content'
import type { ItemTemplate } from '#shared/kernel/library'
import { allowsWorkspaceAction } from '#shared/kernel/workspaceSettings'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data: overview } = useWorkspace(workspaceId)
const api = useApi().library
const query = useLazyAsyncData(`workspace-templates:${workspaceId}`, async () => (await api.workspaceTemplates(workspaceId)).data, { server: false, default: () => [] })
const builtins = useLazyAsyncData('library:templates', async () => (await api.templates()).data, { server: false, default: () => [] })
const manager = computed(() => !!overview.value && ['owner', 'admin'].includes(overview.value.workspace.role) && !overview.value.workspace.archivedAt)
const writable = computed(() => !!overview.value && !overview.value.workspace.archivedAt && allowsWorkspaceAction(overview.value.workspace.role, overview.value.workspace.settings, 'createItems'))
const kind = ref('all'), search = ref('')
const filters = [{ label: 'All types', value: 'all' }, ...itemKinds.map(value => ({ label: itemTypeLabels[value], value }))]
function matches(template: Omit<ItemTemplate, 'content'>) {
  return (kind.value === 'all' || template.kind === kind.value) && `${template.title} ${template.description}`.toLowerCase().includes(search.value.trim().toLowerCase())
}
const workspaceTemplates = computed(() => query.data.value.filter(matches))
const builtinTemplates = computed(() => {
  const templates = builtins.data.value.filter(matches)
  const featured = itemKinds.flatMap(kind => templates.find(template => template.kind === kind) || [])
  const ids = new Set(featured.map(template => template.id))
  return [...featured, ...templates.filter(template => !ids.has(template.id))]
})
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
    const item = (await api.createTemplate(workspaceId, id, null)).data
    await navigateTo(`/workspaces/${workspaceId}/items/${item.id}`)
  } catch (cause) {
    toast.add({ title: 'Unable to create item', description: errorMessage(cause), color: 'error' })
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
  <WorkspaceFeatureScreen
    :workspace-id="workspaceId"
    :workspace="overview?.workspace"
    title="Templates"
    description="Reusable starting points. Save an item as a workspace template from its actions menu."
    icon="i-lucide-layout-template"
  >
    <div class="flex flex-wrap items-center justify-between gap-ui-lg border-b border-muted pb-ui-lg">
      <UTabs
        v-model="kind"
        :items="filters"
        :content="false"
        variant="link"
        :ui="{ list: 'flex-wrap', trigger: 'text-sm' }"
      />
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a template…"
        aria-label="Search templates"
        class="w-full sm:w-ui-17xl"
      />
    </div>
    <section
      class="space-y-ui-xl"
      aria-labelledby="builtin-template-heading"
    >
      <div class="space-y-ui-xs">
        <h2
          id="builtin-template-heading"
          class="text-base font-semibold text-highlighted"
        >
          A head start for your next idea
        </h2>
        <p class="text-sm text-muted">
          Ready-to-use documents, boards, whiteboards, and diagrams. Make them your own.
        </p>
      </div>
      <DataSkeleton
        v-if="builtins.status.value === 'pending' && !builtins.data.value.length"
        label="Loading built-in templates"
      />
      <DataRetry
        v-else-if="builtins.error.value"
        :feedback-keys="['library:templates']"
        :on-retry="() => builtins.refresh()"
      />
      <div
        v-else-if="builtinTemplates.length"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-ui-xl"
      >
        <ItemTemplateCard
          v-for="template in builtinTemplates"
          :key="template.id"
          :template="template"
          :writable="writable"
          :busy="!!busy"
          :loading="busy === template.id"
          @use="create(template.id)"
        />
      </div>
      <p
        v-else
        class="text-sm text-muted py-ui-2xl"
      >
        No templates match your search. Try another type or keyword.
      </p>
    </section>
    <section
      class="space-y-ui-xl"
      aria-labelledby="workspace-template-heading"
    >
      <div class="space-y-ui-xs">
        <h2
          id="workspace-template-heading"
          class="text-base font-semibold text-highlighted"
        >
          Made by your team
        </h2>
        <p class="text-sm text-muted">
          Reusable snapshots of items you can access. Save one from an item's actions menu.
        </p>
      </div>
      <DataSkeleton
        v-if="query.status.value === 'pending' && !query.data.value.length"
        label="Loading workspace templates"
      />
      <DataRetry
        v-else-if="query.error.value"
        :feedback-keys="[`workspace-templates:${workspaceId}`]"
        :on-retry="() => query.refresh()"
      />
      <div
        v-else-if="workspaceTemplates.length"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-ui-xl"
      >
        <ItemTemplateCard
          v-for="template in workspaceTemplates"
          :key="template.id"
          :template="template"
          :writable="writable"
          :removable="manager"
          :busy="!!busy"
          :loading="busy === template.id"
          @use="create(template.id)"
          @remove="deleting = template.id"
        />
      </div>
      <div
        v-else
        class="flex items-center gap-ui-lg rounded-md border border-dashed border-default px-ui-xl py-ui-2xl"
      >
        <UIcon
          name="i-lucide-layout-template"
          class="size-ui-2xl text-dimmed shrink-0"
        />
        <p class="text-sm text-muted">
          {{ query.data.value.length ? 'No team templates match your search.' : 'Your team templates will live here. Start with a built-in template below.' }}
        </p>
      </div>
    </section>
    <ConfirmationDialog
      v-model:open="removalOpen"
      title="Delete template"
      description="This removes the reusable template. Its source item remains available."
      :on-confirm="remove"
    />
  </WorkspaceFeatureScreen>
</template>
