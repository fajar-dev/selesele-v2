<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import PageSection from '~/components/ui/PageSection.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import type { WorkspaceActivityPage } from '#shared/contracts/workspaceSettings'

const props = defineProps<{
  workspaceId: string
  activity: WorkspaceActivityPage
  loading: boolean
  error: string | null
  busy: boolean
  onMore: () => Promise<void>
  onRetry: () => Promise<unknown>
}>()
const actionLabel = (value: string) => value.replaceAll('.', ' ').replaceAll('_', ' ')

useFeedbackToast(() => props.error, { key: `workspace-activity:${props.workspaceId}`, title: 'Unable to load activity', recovered: () => !props.loading && !props.error, retry: () => props.onRetry() })
</script>

<template>
  <PageSection
    title="Activity log"
    description="A history of changes to workspace content, membership, and settings. New activity appears here after reopening this section."
  >
    <DataSkeleton
      v-if="loading"
      label="Loading workspace activity"
    />
    <DataRetry
      v-else-if="error"
      :feedback-keys="[`workspace-activity:${workspaceId}`]"
      :on-retry="onRetry"
    />
    <p
      v-else-if="!activity.items.length"
      class="text-sm text-muted py-ui-3xl"
    >
      Your team’s activity will appear here as changes happen.
    </p>
    <ol
      v-else
      class="divide-y divide-muted"
    >
      <li
        v-for="item in activity.items"
        :key="item.id"
        class="flex flex-wrap justify-between gap-ui-md py-ui-xl"
      >
        <div class="min-w-ui-zero flex-1">
          <p class="text-sm">
            <span class="font-medium">{{ item.actorName }}</span><span class="text-muted"> · {{ actionLabel(item.action) }}</span>
          </p><p class="mt-ui-xs text-sm text-muted break-words">
            {{ item.target }}
          </p>
        </div>
        <time
          :datetime="item.createdAt"
          class="text-xs text-muted"
        >{{ new Date(item.createdAt).toLocaleString() }}</time>
      </li>
    </ol>
    <UButton
      v-if="activity.nextCursor"
      label="Load more"
      color="neutral"
      variant="outline"
      :loading="busy"
      @click="onMore"
    />
  </PageSection>
</template>
