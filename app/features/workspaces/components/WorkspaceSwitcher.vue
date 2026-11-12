<script setup lang="ts">
import { useWorkspaceDirectory } from '~/features/workspaces/composables/useWorkspaceDirectory'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WorkspaceItem } from '#shared/contracts/workspace'

defineProps<{ workspace: WorkspaceItem }>()
const { data, error, status, refresh } = await useWorkspaceDirectory()
const route = useRoute()
const items = computed<DropdownMenuItem[][]>(() => [
  [
    { label: 'Switch workspace', type: 'label' },
    ...data.value.map(workspace => ({
      label: workspace.name,
      icon: route.params.workspaceId === workspace.id ? 'i-lucide-check' : 'i-lucide-panels-top-left',
      to: `/workspaces/${workspace.id}`,
      description: workspace.role
    })),
    ...(error.value ? [{ label: 'Unable to load workspaces. Retry', icon: 'i-lucide-refresh-cw', onSelect: () => refresh() }] : []),
    ...(!data.value.length && status.value === 'pending' ? [{ label: 'Loading workspaces…', disabled: true }] : [])
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
    :ui="{ content: 'w-64', itemLabel: 'truncate', itemDescription: 'capitalize text-xs' }"
    @update:open="opened"
  >
    <UButton
      :label="workspace.name"
      aria-label="Switch workspace"
      trailing-icon="i-lucide-chevrons-up-down"
      color="neutral"
      variant="ghost"
      class="w-full text-sm justify-between py-2 font-semibold"
      :ui="{ label: 'truncate flex-1 text-left' }"
    >
      <template #leading>
        <UIcon
          name="i-lucide-panels-top-left"
          class="size-5 text-highlighted"
        />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
