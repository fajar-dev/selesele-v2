<script setup lang="ts">
import type { MoveImpact } from '#shared/kernel/access'

const { impact, busy, onConfirm } = defineProps<{
  impact: MoveImpact
  busy: boolean
  onConfirm: () => Promise<void>
}>()
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Moving changes access"
    description="Folder permissions limit access to the pages inside. Review these changes before moving."
    :dismissible="!busy"
    :close="!busy"
    :ui="{ content: 'sm:max-w-panel-md', body: 'space-y-ui-lg', footer: 'justify-end gap-ui-sm' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ impact.changes.length }} members will have different access. Page overrides stay in place.
      </p>
      <div
        v-if="impact.canPreviewNames"
        class="max-h-ui-18xl overflow-y-auto divide-y divide-muted"
      >
        <div
          v-for="change in impact.changes"
          :key="change.memberId"
          class="flex gap-ui-md items-center py-ui-md text-sm"
        >
          <span class="min-w-ui-zero flex-1 truncate">{{ change.name }}</span><span class="text-muted capitalize">{{ change.before }}</span><UIcon
            name="i-lucide-arrow-right"
            class="size-ui-lg text-muted"
          /><span
            class="capitalize"
            :class="change.after === 'none' ? 'text-error' : 'text-highlighted'"
          >{{ change.after }}</span>
        </div>
      </div>
      <p
        v-else
        class="text-sm text-muted"
      >
        An owner or admin with document management access can review the affected members.
      </p>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="busy"
        @click="open = false"
      /><UButton
        label="Move page"
        icon="i-lucide-folder-input"
        :loading="busy"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
