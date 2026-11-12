<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { workspaceInputSchema } from '#shared/validation/workspace'
import { workspaceService } from '~/services/workspaceService'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
const workspaceId = String(route.params.workspaceId)
const { data } = await useWorkspace(workspaceId)
const toast = useToast()
const schema = workspaceInputSchema.pick({ name: true })
const state = reactive({ name: '' })
const saving = ref(false)
const deleteOpen = ref(false)
const manager = computed(() => data.value?.workspace.role === 'owner' || data.value?.workspace.role === 'admin')
const changed = computed(() => state.name.trim() !== data.value?.workspace.name)
const breadcrumbs = computed(() => [
  { label: data.value?.workspace.name || 'Workspace', icon: 'i-lucide-panels-top-left', to: `/workspaces/${workspaceId}` },
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
    await workspaceService.rename(workspaceId, event.data.name)
  } catch (cause) {
    toast.add({ title: 'Unable to update workspace', description: errorMessage(cause), color: 'error' })
    saving.value = false
    return
  }
  try {
    await Promise.all([refreshWorkspace(workspaceId), refreshNuxtData('workspace-directory'), refreshNuxtData('workspace-home')])
    toast.add({ title: 'Workspace updated', color: 'success' })
  } catch {
    toast.add({ title: 'Workspace updated. Reload to refresh the workspace details.', color: 'warning' })
  } finally {
    saving.value = false
  }
}
async function deleteWorkspace() {
  if (data.value?.workspace.role !== 'owner') {
    return
  }
  await workspaceService.delete(workspaceId)
  await Promise.allSettled([refreshNuxtData('workspace-directory'), refreshNuxtData('workspace-home')])
  await navigateTo('/')
  clearNuxtData(`workspace:${workspaceId}`)
}
</script>

<template>
  <div
    v-if="data"
    class="pb-14 app-enter"
  >
    <AppHeader>
      <template #left>
        <WorkspacesBreadcrumbs :items="breadcrumbs" />
      </template>
    </AppHeader>
    <WorkspacesContent>
      <WorkspacesHeading
        title="Settings"
        description="Manage the details of your shared workspace."
      >
        <template #icon>
          <UIcon
            name="i-lucide-settings-2"
            class="size-7"
          />
        </template>
        <template #metadata>
          <span>{{ data.workspace.name }}</span><span class="text-dimmed">·</span><span class="capitalize">{{ data.workspace.role }}</span>
        </template>
      </WorkspacesHeading>
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
    </WorkspacesContent>
    <DeleteConfirmModal
      v-model:open="deleteOpen"
      title="Delete workspace"
      :description="`Delete ${data.workspace.name}? All members will lose access to its folders and pages.`"
      confirm-label="Delete workspace"
      :on-confirm="deleteWorkspace"
    />
  </div>
</template>
