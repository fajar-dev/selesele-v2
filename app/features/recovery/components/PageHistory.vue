<script setup lang="ts">
import DetailPanel from '~/components/ui/DetailPanel.vue'
import DocumentPreview from '~/components/ui/DocumentPreview.vue'
import { usePageHistory } from '../composables/usePageHistory'

const props = defineProps<{ pageId: string }>()
const { open, selected, preview, busy, previewLoading, error, confirming, data, status, loadError, current, time, day, inspect, act } = usePageHistory(props.pageId)
</script>

<template>
  <DetailPanel
    v-model:open="open"
    title="Version history"
    description="Preview and restore previous versions of this page."
    icon="i-lucide-history"
    wide
  >
    <UButton
      aria-label="Version history"
      icon="i-lucide-history"
      size="sm"
      variant="ghost"
      color="neutral"
    />
    <template #body>
      <div class="history-layout">
        <aside
          class="history-timeline"
          aria-label="Saved versions"
        >
          <div class="flex items-center justify-between mb-ui-lg px-ui-xs">
            <span class="text-xs font-medium text-muted">Snapshots</span><UTooltip text="Save version now">
              <UButton
                aria-label="Save version now"
                icon="i-lucide-plus"
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="busy"
                @click="act(false)"
              />
            </UTooltip>
          </div>
          <div
            v-if="status === 'pending' && !data.length"
            class="space-y-ui-lg p-ui-sm"
          >
            <USkeleton
              v-for="row in 3"
              :key="row"
              aria-hidden="true"
              class="h-ui-4xl w-full"
            />
          </div>
          <p
            v-else-if="!data.length"
            class="px-ui-xs text-xs text-muted leading-relaxed"
          >
            Snapshots appear as you write. Save one with the plus button.
          </p>
          <button
            v-for="version in data"
            :key="version.id"
            type="button"
            class="history-version"
            :class="{ 'is-selected': selected === version.id }"
            :aria-pressed="selected === version.id"
            :aria-label="`${day(version.createdAt)}, ${time(version.createdAt)} · ${version.author || 'Automatic snapshot'}`"
            @click="inspect(version.id)"
          >
            <span class="flex items-center justify-between gap-ui-sm text-xs font-medium text-toned"><span>{{ day(version.createdAt) }}</span><span class="font-normal text-muted">{{ time(version.createdAt) }}</span></span>
            <span class="block text-xs text-muted mt-ui-xs truncate">{{ version.author || 'Automatic snapshot' }}</span>
          </button>
          <p class="hidden sm:block mt-auto pt-ui-xl text-xs leading-normal text-dimmed">
            Auto-saved while writing.<br>Up to 100 versions per page.
          </p>
        </aside>
        <section
          class="history-document"
          aria-label="Version preview"
        >
          <UAlert
            v-if="error || loadError"
            title="Unable to load history"
            :description="error || errorMessage(loadError)"
            color="error"
            variant="soft"
            class="mb-ui-xl"
          />
          <template v-if="current">
            <div class="flex items-center justify-between gap-ui-md pb-ui-xl border-b border-muted mb-ui-2xl">
              <div>
                <p class="text-xs text-muted mb-ui-xs">
                  Preview
                </p><p class="text-sm font-medium text-highlighted">
                  {{ day(current.createdAt) }}, {{ time(current.createdAt) }}
                </p>
              </div><UBadge
                label="Saved version"
                color="neutral"
                variant="soft"
                size="sm"
              />
            </div>
            <div
              v-if="previewLoading"
              class="space-y-ui-lg"
              role="status"
              aria-label="Loading version preview"
            >
              <USkeleton
                aria-hidden="true"
                class="h-ui-2xl w-proportion-two-thirds"
              /><USkeleton
                v-for="row in 4"
                :key="row"
                aria-hidden="true"
                class="h-ui-md w-full"
              />
            </div>
            <DocumentPreview
              v-else-if="preview !== null"
              :key="selected || ''"
              :content="preview"
            />
          </template>
          <div
            v-else-if="!loadError"
            class="h-full min-h-ui-14xl flex flex-col items-center justify-center text-center px-ui-2xl"
          >
            <UIcon
              name="i-lucide-history"
              class="size-ui-3xl text-dimmed mb-ui-lg"
            /><h3 class="text-sm font-medium text-toned">
              Your page has a history
            </h3><p class="text-xs text-muted leading-relaxed mt-ui-sm max-w-ui-16xl">
              Save a snapshot to keep this moment, or come back after your next edit.
            </p>
          </div>
        </section>
      </div>
    </template>
    <template #footer>
      <div
        v-if="confirming"
        class="w-full space-y-ui-md"
      >
        <p class="text-xs text-muted leading-relaxed">
          Replace the live page with this version? The current content will be saved first.
        </p><div class="flex gap-ui-sm">
          <UButton
            label="Confirm restore"
            :loading="busy"
            @click="act(true)"
          /><UButton
            label="Cancel"
            variant="ghost"
            color="neutral"
            :disabled="busy"
            @click="confirming = false"
          />
        </div>
      </div>
      <div
        v-else
        class="flex items-center justify-between gap-ui-md w-full"
      >
        <p class="text-xs text-muted">
          {{ current ? 'You’re viewing a previous version.' : 'Your live page stays unchanged.' }}
        </p><UButton
          label="Restore version"
          icon="i-lucide-rotate-ccw"
          size="sm"
          :disabled="!current || preview === null || previewLoading"
          @click="confirming = true"
        />
      </div>
    </template>
  </DetailPanel>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.history-layout { display: flex; min-height: 100%; }
.history-timeline { display: flex; flex-direction: column; width: var(--container-timeline); flex-shrink: 0; padding: var(--spacing-ui-lg) var(--spacing-ui-md); border-right: var(--app-border-thin) solid var(--ui-border-muted); background: var(--app-sidebar); }
.history-version { text-align: left; padding: var(--spacing-ui-md) var(--spacing-ui-sm); border-radius: var(--radius-sm); margin-bottom: var(--spacing-ui-2xs); }
.history-version:hover, .history-version.is-selected { background: var(--app-hover); }
.history-version.is-selected { box-shadow: var(--app-selected-version-shadow); }
.history-document { flex: 1; min-width: 0; padding: var(--spacing-ui-2xl); }
@variant max-sm {
  .history-layout { flex-direction: column; }
  .history-timeline { width: 100%; max-height: var(--container-timeline); overflow-y: auto; border-right: 0; border-bottom: var(--app-border-thin) solid var(--ui-border-muted); }
  .history-document { padding: var(--spacing-ui-xl); }
}
</style>
