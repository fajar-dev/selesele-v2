<script setup lang="ts">
import PageSection from '~/components/ui/PageSection.vue'
import type { WorkspaceCapability, WorkspaceSettings } from '#shared/kernel/workspaceSettings'

defineProps<{
  manager: boolean
  busy: boolean
  onSave: () => Promise<void>
}>()
const model = defineModel<WorkspaceSettings>({ required: true })
const capabilities: {
  key: WorkspaceCapability
  title: string
  description: string
}[] = [
  { key: 'inviteMembers', title: 'Add people', description: 'Choose who can add Members or Viewers. Only the Owner can appoint Admins.' },
  { key: 'createPages', title: 'Create pages', description: 'Choose who can add pages and use templates.' },
  { key: 'createFolders', title: 'Create folders', description: 'Choose who can organize new folders.' },
  { key: 'deleteContent', title: 'Delete content', description: 'Controls moving pages and folders to Trash.' }
]
const audiences = [{ label: 'Owners and admins', value: 'managers' }, { label: 'Owners, admins and members', value: 'members' }]
</script>

<template>
  <PageSection
    title="Workspace rules"
    description="Choose who can create content and add people. Individual and group document access is managed in Members; these rules never bypass restricted documents."
  >
    <div
      v-for="capability in capabilities"
      :key="capability.key"
      class="flex flex-wrap items-start justify-between gap-ui-lg border-b border-muted pb-ui-xl"
    >
      <div class="max-w-sm">
        <h3 class="text-sm font-medium">
          {{ capability.title }}
        </h3><p class="text-sm text-muted mt-ui-xs leading-relaxed">
          {{ capability.description }}
        </p>
      </div>
      <USelect
        v-model="model.permissions[capability.key]"
        :items="audiences"
        :disabled="!manager"
        :aria-label="capability.title"
        class="w-full sm:w-ui-15xl"
      />
    </div>
    <UButton
      v-if="manager"
      label="Save permissions"
      :loading="busy"
      @click="onSave"
    />
  </PageSection>
</template>
