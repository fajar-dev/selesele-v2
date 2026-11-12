<script setup lang="ts">
import { useWorkspaceActions } from '~/features/workspaces/composables/useWorkspaceActions'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import AppHeader from '~/components/shell/AppHeader.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import type { FormSubmitEvent } from '@nuxt/ui'
import { workspaceInputSchema } from '#shared/validation/workspace'

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { save: saveWorkspace, remove: deleteWorkspace } = useWorkspaceActions(workspaceId)
const { data, loading, error, refresh } = useWorkspace(workspaceId)
const toast = useToast()
const schema = workspaceInputSchema.pick({ name: true })
const state = reactive({ name: '' })
const saving = ref(false)
const deleteOpen = ref(false)
const manager = computed(() => data.value?.workspace.role === 'owner' || data.value?.workspace.role === 'admin')
const changed = computed(() => state.name.trim() !== data.value?.workspace.name)
const breadcrumbs = computed(() => [
  { label: data.value?.workspace.name || 'Workspace', emoji: data.value?.workspace.icon, icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
  { label: 'Settings', icon: 'i-lucide-settings-2' }
])
watch(() => data.value?.workspace.name, (name) => {
  state.name = name || ''
}, { immediate: true })

async function save(event: FormSubmitEvent<{ name: string }>) {
  if (saving.value || !manager.value || !changed.value) {
    return
  }
  saving.value = true
  try {
    await saveWorkspace({ name: event.data.name })
    toast.add({ title: 'Workspace updated', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to update workspace', description: errorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="loading"
    class="workspace-content workspace-content-start"
  >
    <DataSkeleton
      kind="heading"
      label="Loading workspace settings"
    /><DataSkeleton class="mt-10" />
  </div>
  <UAlert
    v-else-if="error"
    title="Unable to load settings"
    color="error"
    :actions="[{ label: 'Retry', onClick: refresh }]"
  />
  <div
    v-else-if="data"
    class="pb-14 app-enter"
  >
    <AppHeader>
      <template #left>
        <PageBreadcrumbs :items="breadcrumbs" />
      </template>
    </AppHeader>
    <PageContent>
      <PageHeading
        title="Settings"
        description="Manage the details of your shared workspace."
      >
        <template #icon>
          <UIcon
            name="i-lucide-settings-2"
            class="size-7"
          />
        </template>
      </PageHeading>
      <section
        aria-label="General settings"
        class="border-t border-muted pt-6 space-y-5"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            General
          </h2><p class="text-sm text-muted mt-1">
            The name appears in navigation and your workspace list.
          </p>
        </div>
        <UForm
          :schema="schema"
          :state="state"
          class="max-w-lg space-y-5"
          @submit="save"
        >
          <UFormField
            label="Workspace name"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              :disabled="!manager || saving"
              maxlength="120"
              class="w-full"
            />
          </UFormField>
          <UButton
            v-if="manager"
            type="submit"
            label="Save changes"
            :loading="saving"
            :disabled="!changed"
          />
          <p
            v-else
            class="text-xs text-muted"
          >
            Only workspace owners and admins can change these settings.
          </p>
        </UForm>
      </section>
      <section
        v-if="data.workspace.role === 'owner'"
        aria-label="Delete workspace"
        class="border-t border-muted pt-6 flex flex-wrap items-center justify-between gap-5"
      >
        <div class="max-w-lg">
          <h2 class="text-sm font-semibold text-highlighted">
            Delete workspace
          </h2><p class="text-sm text-muted mt-1 leading-relaxed">
            Delete this workspace and remove access to its folders and pages for all members.
          </p>
        </div>
        <UButton
          label="Delete workspace"
          icon="i-lucide-trash-2"
          color="error"
          variant="outline"
          @click="deleteOpen = true"
        />
      </section>
    </PageContent>
    <ConfirmationDialog
      v-model:open="deleteOpen"
      title="Delete workspace"
      :description="`Delete ${data.workspace.name}? All members will lose access to its folders and pages.`"
      confirm-label="Delete workspace"
      :on-confirm="deleteWorkspace"
    />
  </div>
</template>
