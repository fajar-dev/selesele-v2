<script setup lang="ts">
import DataRetry from '~/components/ui/DataRetry.vue'
import type { WorkspaceItem } from '#shared/contracts/workspace'
import AppHeader from '~/components/shell/AppHeader.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'
import ScreenContent from '~/components/ui/ScreenContent.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'

defineProps<{
  workspaceId: string
  workspace: WorkspaceItem | undefined
  title: string
  description: string
  icon: string
  loading: boolean
  error: string | null
  onRetry: () => Promise<unknown>
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
      </ScreenHeading>
      <DataSkeleton
        v-if="loading"
        :label="`Loading ${title.toLowerCase()}`"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`workspaces:${workspaceId}`]"
        :on-retry="onRetry"
      />
      <div
        v-else-if="workspace"
        class="flex flex-col md:flex-row gap-ui-5xl border-t border-muted pt-ui-2xl"
      >
        <aside class="md:w-ui-16xl shrink-0 md:self-start">
          <slot name="navigation" />
        </aside>
        <div class="flex-1 min-w-ui-zero space-y-ui-xl">
          <slot />
        </div>
      </div>
    </ScreenContent>
  </div>
</template>
