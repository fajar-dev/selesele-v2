<script setup lang="ts">
import EntityIcon from '~/components/ui/EntityIcon.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceDirectory } from '~/features/workspaces/composables/useWorkspaceDirectory'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WorkspaceItem } from '#shared/contracts/workspace'

defineProps<{ workspace: WorkspaceItem }>()
const { data, error, status, refresh } = useWorkspaceDirectory()
const route = useRoute()
type WorkspaceMenuItem = DropdownMenuItem | (DropdownMenuItem & { slot: 'workspace', emoji: string, checked: boolean })
const items = computed<WorkspaceMenuItem[][]>(() => [
  [
    { label: 'Switch workspace', type: 'label' },
    ...data.value.map(workspace => ({
      label: workspace.name,
      slot: 'workspace',
      emoji: workspace.icon,
      checked: route.params.workspaceId === workspace.id,
      to: `/workspaces/${workspace.id}`,
      description: workspace.role
    })),
    ...(error.value ? [{ label: 'Unable to load workspaces. Retry', icon: 'i-lucide-refresh-cw', onSelect: () => refresh() }] : [])
  ],
  [{ label: 'All workspaces', icon: 'i-lucide-layout-grid', to: '/' }]
])
function opened(open: boolean) {
  if (open) {
    refresh()
  }
}
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start' }"
    :ui="{ content: 'w-ui-16xl', itemLabel: 'truncate', itemDescription: 'capitalize text-xs' }"
    @update:open="opened"
  >
    <template #workspace-leading="{ item }">
      <EntityIcon
        :value="item.emoji"
        fallback="i-lucide-panels-top-left"
        class="size-ui-lg text-base"
      />
    </template>
    <template #workspace-trailing="{ item }">
      <UIcon
        v-if="item.checked"
        name="i-lucide-check"
        class="size-ui-lg text-muted"
      />
    </template>
    <template #content-top>
      <DataSkeleton
        v-if="!data.length && (status === 'idle' || status === 'pending')"
        label="Loading workspaces"
        :rows="3"
        class="p-ui-md"
      />
    </template>
    <UButton
      :label="workspace.name"
      aria-label="Switch workspace"
      trailing-icon="i-lucide-chevrons-up-down"
      color="neutral"
      variant="ghost"
      class="w-full text-sm justify-between py-ui-sm font-semibold"
      :ui="{ label: 'truncate flex-1 text-left' }"
    >
      <template #leading>
        <EntityIcon
          :value="workspace.icon"
          fallback="i-lucide-panels-top-left"
          class="size-ui-xl text-xl text-highlighted"
        />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
