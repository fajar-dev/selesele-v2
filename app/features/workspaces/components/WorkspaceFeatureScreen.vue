<script setup lang="ts">
import type { WorkspaceItem } from '#shared/contracts/workspace'
import AppHeader from '~/components/shell/AppHeader.vue'
import ScreenContent from '~/components/ui/ScreenContent.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'

defineProps<{
  workspaceId: string
  workspace?: WorkspaceItem
  title: string
  description: string
  icon: string
}>()
</script>

<template>
  <div class="pb-ui-7xl app-enter">
    <AppHeader>
      <template #left>
        <Breadcrumbs :items="[{ label: workspace?.name || 'Workspace', emoji: workspace?.icon, to: `/workspaces/${workspaceId}` }, { label: title, icon }]" />
      </template>
    </AppHeader>
    <ScreenContent>
      <ScreenHeading
        :title="title"
        :description="description"
      >
        <template #icon>
          <UIcon
            :name="icon"
            class="size-ui-3xl"
          />
        </template>
        <template
          v-if="$slots.actions"
          #actions
        >
          <slot name="actions" />
        </template>
        <template
          v-if="$slots.title"
          #title
        >
          <slot name="title" />
        </template>
      </ScreenHeading>
      <slot />
    </ScreenContent>
  </div>
</template>
