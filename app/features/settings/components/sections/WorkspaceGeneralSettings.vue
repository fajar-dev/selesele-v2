<script setup lang="ts">
import { reconcileDraft } from '~/core/state/reconcileDraft'
import ScreenSection from '~/components/ui/ScreenSection.vue'
import EntityIconPicker from '~/components/ui/EntityIconPicker.vue'
import { useWorkspaceActions } from '~/features/workspaces/composables/useWorkspaceActions'
import type { WorkspaceOverview } from '#shared/contracts/workspace'
import type { WorkspaceSettings } from '#shared/contracts/workspaceSettings'

const props = defineProps<{
  workspaceId: string
  overview: WorkspaceOverview
  manager: boolean
  busy: boolean
  onSave: () => Promise<void>
}>()
const settings = defineModel<WorkspaceSettings>('settings', { required: true })
const { save } = useWorkspaceActions(props.workspaceId)
const toast = useToast()
const form = reactive({ name: '', description: '' })
watch(() => props.overview.workspace, (workspace, previous) => {
  Object.assign(form, reconcileDraft({ ...form }, previous ? { name: previous.name, description: previous.description } : undefined, { name: workspace.name, description: workspace.description }))
}, { immediate: true })
const saving = ref(false)
const overviewOption = 'workspace-overview'
const homeItems = computed(() => {
  const selected = settings.value.homeItemId
  const unavailable = selected && !props.overview.items.some(item => item.id === selected)
  return [
    { label: 'Workspace overview', value: overviewOption },
    ...(unavailable ? [{ label: 'Unavailable item', value: selected, disabled: true }] : []),
    ...props.overview.items.map(item => ({ label: item.title, value: item.id }))
  ]
})
const home = computed({ get: () => settings.value.homeItemId || overviewOption, set: (value: string) => {
  settings.value.homeItemId = value === overviewOption ? null : value
} })
async function submit() {
  saving.value = true
  try {
    if (!props.overview.workspace.archivedAt) {
      await save({ name: form.name, description: form.description })
    }
  } catch (cause) {
    toast.add({ title: 'Unable to save workspace', description: errorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenSection
    title="Workspace details"
    description="Give your team a recognizable place to work."
  >
    <EntityIconPicker
      :value="overview.workspace.icon"
      label="Change workspace icon"
      :readonly="!manager || !!overview.workspace.archivedAt"
      :on-save="icon => save({ icon })"
    />
    <form
      class="space-y-ui-xl"
      @submit.prevent="submit"
    >
      <UFormField
        label="Workspace name"
        required
      >
        <UInput
          v-model="form.name"
          class="w-full"
          maxlength="120"
          required
          :disabled="!manager || !!overview.workspace.archivedAt"
        />
      </UFormField>
      <UFormField
        label="Description"
        description="Help teammates understand what belongs here."
      >
        <UTextarea
          v-model="form.description"
          class="w-full"
          maxlength="2000"
          :disabled="!manager || !!overview.workspace.archivedAt"
          autoresize
        />
      </UFormField>
      <UButton
        v-if="manager && !overview.workspace.archivedAt"
        label="Save workspace details"
        type="submit"
        :loading="saving || busy"
        :disabled="!form.name.trim()"
      />
    </form>
  </ScreenSection>
  <ScreenSection
    title="Opening item"
    description="Choose the document members open first. Each member still needs permission to read that document."
  >
    <UFormField
      label="Default opening item"
      description="Where members land when opening this workspace."
    >
      <USelect
        v-model="home"
        :items="homeItems"
        class="w-full"
        :disabled="!manager"
      />
    </UFormField>
    <UButton
      v-if="manager"
      label="Save opening item"
      :loading="busy"
      @click="onSave"
    />
  </ScreenSection>
</template>
