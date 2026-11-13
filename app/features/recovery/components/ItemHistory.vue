<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import DetailPanel from '~/components/ui/DetailPanel.vue'
import DocumentPreview from '~/components/ui/DocumentPreview.vue'
import VersionComparison from './VersionComparison.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useItemHistory } from '../composables/useItemHistory'

const props = withDefaults(defineProps<{
  itemId: string
  kind?: string
  readonly?: boolean
}>(), { kind: 'document', readonly: false })
const CanvasPreview = defineAsyncComponent(() => import('~/features/canvases/components/CanvasPreview.vue'))
const { open, selected, preview, liveContent, busy, previewLoading, error, confirming, data, status, loadError, current, refresh, inspect, act } = useItemHistory(props.itemId)
const view = ref('preview')
const loading = computed(() => status.value === 'pending' || status.value === 'idle')
const versions = computed(() => data.value.map((version, index) => ({
  value: version.id,
  label: new Date(version.createdAt).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  description: `${version.author || 'Automatic snapshot'}${index === 0 ? ' · Latest saved' : ''}`
})))
function selectVersion(id: string | undefined) {
  if (id) {
    void inspect(id)
  }
}
useFeedbackToast(loadError, { key: `versions:${props.itemId}`, title: 'Unable to load versions', recovered: () => status.value === 'success', retry: () => refresh() })
useFeedbackToast(error, { key: `version-action:${props.itemId}`, title: 'Unable to complete version request' })
</script>

<template>
  <DetailPanel
    v-model:open="open"
    title="Version history"
    description="Preview and restore previous versions of this item."
    icon="i-lucide-history"
  >
    <UTooltip text="Version history">
      <UButton
        aria-label="Version history"
        icon="i-lucide-history"
        size="sm"
        variant="ghost"
        color="neutral"
      />
    </UTooltip>
    <template #body>
      <div class="sticky top-ui-zero z-10 bg-default border-b border-muted px-ui-xl py-ui-lg space-y-ui-md">
        <div class="flex items-center justify-between gap-ui-md">
          <p class="text-xs font-medium text-toned">
            Saved versions
            <span
              v-if="data.length"
              class="ml-ui-xs font-normal text-muted tabular-nums"
            >{{ data.length }}</span>
          </p>
          <UButton
            label="Save version"
            icon="i-lucide-plus"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="busy"
            :disabled="readonly || busy"
            @click="act(false)"
          />
        </div>
        <USkeleton
          v-if="loading && !data.length"
          aria-label="Loading saved versions"
          class="h-ui-4xl w-full"
        />
        <USelectMenu
          v-else-if="data.length"
          :model-value="selected || undefined"
          :items="versions"
          value-key="value"
          aria-label="Choose a saved version"
          placeholder="Choose a version"
          :search-input="{ placeholder: 'Find a version…' }"
          :filter-fields="['label', 'description']"
          :disabled="busy"
          color="neutral"
          variant="outline"
          class="w-full"
          :ui="{ itemLabel: 'text-sm', itemDescription: 'text-xs', value: 'truncate' }"
          @update:model-value="selectVersion"
        />
        <p class="text-xs text-muted leading-relaxed">
          Versions are saved automatically as you write. Previewing keeps your live item unchanged.
        </p>
      </div>
      <div class="p-ui-xl space-y-ui-xl">
        <DataRetry
          v-if="loadError"
          :feedback-keys="[`versions:${props.itemId}`]"
          :on-retry="() => refresh()"
        />
        <DataRetry
          v-if="error && current && preview === null"
          :feedback-keys="[`version-action:${props.itemId}`]"
          :on-retry="() => inspect(current!.id)"
        />
        <DataSkeleton
          v-if="previewLoading || (loading && !data.length)"
          label="Loading version preview"
          kind="editor"
          :rows="5"
        />
        <section
          v-else-if="current && preview !== null"
          aria-label="Version preview"
          class="space-y-ui-xl"
        >
          <div
            class="flex gap-ui-sm"
            role="group"
            aria-label="Version view"
          >
            <UButton
              v-for="item in ['preview', 'changes']"
              :key="item"
              :label="item === 'preview' ? 'Preview' : 'Changes'"
              color="neutral"
              :variant="view === item ? 'soft' : 'ghost'"
              :aria-pressed="view === item"
              size="sm"
              @click="view = item"
            />
          </div>
          <div class="flex items-center gap-ui-sm text-xs text-muted">
            <UIcon
              name="i-lucide-file-clock"
              class="size-ui-lg shrink-0"
            />
            <p class="min-w-ui-zero truncate">
              Saved by {{ current.author || 'automatic snapshot' }}
            </p>
            <span class="ml-auto shrink-0">Read-only</span>
          </div>
          <DocumentPreview
            v-if="view === 'preview' && kind === 'document'"
            :key="selected || ''"
            :content="preview"
          />
          <CanvasPreview
            v-else-if="view === 'preview'"
            :content="preview"
          />
          <VersionComparison
            v-else
            :before="liveContent"
            :after="preview"
          />
        </section>
        <div
          v-else-if="!loadError && !error"
          class="flex flex-col items-center text-center px-ui-xl py-ui-8xl"
        >
          <UIcon
            name="i-lucide-history"
            class="size-ui-3xl text-dimmed mb-ui-xl"
          />
          <h3 class="text-sm font-medium text-highlighted">
            No saved versions yet
          </h3>
          <p class="text-xs text-muted leading-relaxed mt-ui-sm max-w-ui-16xl">
            Save a version now, or keep writing. Your item history will appear here.
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="w-full space-y-ui-lg">
        <div v-if="confirming">
          <p class="text-sm font-medium text-highlighted">
            Restore this version?
          </p>
          <p class="text-xs text-muted leading-relaxed mt-ui-sm">
            This replaces the live item for everyone. Its current content will be saved in history first.
          </p>
        </div>
        <div class="flex items-center justify-between gap-ui-md">
          <UButton
            v-if="confirming"
            label="Cancel"
            variant="ghost"
            color="neutral"
            size="sm"
            :disabled="busy"
            @click="confirming = false"
          />
          <span
            v-else
            class="text-xs text-muted"
          >Up to 100 saved versions</span>
          <UButton
            :label="confirming ? 'Confirm restore' : 'Restore version'"
            icon="i-lucide-rotate-ccw"
            color="primary"
            size="sm"
            :loading="confirming && busy"
            :disabled="readonly || !current || preview === null || previewLoading || busy"
            @click="confirming ? act(true) : confirming = true"
          />
        </div>
      </div>
    </template>
  </DetailPanel>
</template>
