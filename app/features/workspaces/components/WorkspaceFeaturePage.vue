<script setup lang="ts">
import type { WorkspaceItem } from '#shared/contracts/workspace'
import AppHeader from '~/components/shell/AppHeader.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'

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
        <PageBreadcrumbs :items="[{ label: workspace?.name || 'Workspace', emoji: workspace?.icon, to: `/workspaces/${workspaceId}` }, { label: title, icon }]" />
      </template>
    </AppHeader>
    <PageContent>
      <PageHeading
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
      </PageHeading>
      <slot />
    </PageContent>
  </div>
</template>
