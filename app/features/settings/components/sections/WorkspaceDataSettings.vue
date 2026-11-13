<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import ScreenSection from '~/components/ui/ScreenSection.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import type { WorkspaceSettings, WorkspaceUsage } from '#shared/contracts/workspaceSettings'

const props = defineProps<{
  usage: WorkspaceUsage | null | undefined
  loading: boolean
  error: string | null
  busy: boolean
  onSave: () => Promise<void>
  onExport: () => Promise<void>
  onRetry: () => Promise<unknown>
  workspaceId: string
}>()
const model = defineModel<WorkspaceSettings>({ required: true })
const toast = useToast()
watch(() => model.value.trashRetentionDays, (days) => {
  if (days) {
    toast.add({ id: `retention:${props.workspaceId}`, title: 'Automatic deletion', description: `After you save, items older than ${days} days will be permanently removed from Trash.`, color: 'warning' })
  }
})
const formatBytes = (value: number) => value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`
useFeedbackToast(() => props.error, { key: `workspace-usage:${props.workspaceId}`, title: 'Unable to load usage', recovered: () => !props.loading && !props.error, retry: () => props.onRetry() })
</script>

<template>
  <div class="space-y-ui-6xl">
    <ScreenSection
      title="Workspace usage"
      description="Document storage includes the collaborative state. Attachment storage counts files referenced by active items."
    >
      <DataSkeleton
        v-if="loading"
        label="Loading workspace usage"
      />
      <DataRetry
        v-else-if="error"
        :feedback-keys="[`workspace-usage:${workspaceId}`]"
        :on-retry="onRetry"
      />
      <dl
        v-else-if="usage"
        class="grid grid-cols-2 sm:grid-cols-3 gap-ui-xl"
      >
        <div
          v-for="stat in [{ label: 'Items', value: usage.items }, { label: 'Folders', value: usage.folders }, { label: 'Members', value: usage.members }, { label: 'Documents', value: formatBytes(usage.documentBytes) }, { label: 'Attachments', value: formatBytes(usage.attachmentBytes) }]"
          :key="stat.label"
        >
          <dt class="text-xs text-muted">
            {{ stat.label }}
          </dt><dd class="mt-ui-sm text-xl font-semibold">
            {{ stat.value }}
          </dd>
        </div>
      </dl>
    </ScreenSection>
    <ScreenSection
      title="Export workspace"
      description="Download active items as Markdown with their referenced images. The .tar.gz archive preserves folders and includes a workspace index. Exports are limited to 50 MB."
    >
      <UButton
        label="Export Markdown & attachments"
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        :loading="busy"
        @click="onExport"
      />
    </ScreenSection>
    <ScreenSection
      title="Trash retention"
      description="Choose when deleted items and folders are permanently removed. Automatic deletion cannot be undone and applies to items already in Trash."
    >
      <USelect
        v-model="model.trashRetentionDays"
        :items="[{ label: 'Keep until manually deleted', value: 0 }, { label: '7 days', value: 7 }, { label: '30 days', value: 30 }, { label: '90 days', value: 90 }]"
        class="w-full sm:w-ui-17xl"
        aria-label="Trash retention"
      />
      <div class="flex flex-wrap gap-ui-md">
        <UButton
          label="Save retention policy"
          :loading="busy"
          @click="onSave"
        /><UButton
          label="Open trash"
          color="neutral"
          variant="ghost"
          :to="`/trash?workspace=${workspaceId}`"
        />
      </div>
    </ScreenSection>
  </div>
</template>
