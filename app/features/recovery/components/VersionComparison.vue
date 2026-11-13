<script setup lang="ts">
import { lineDiff } from '../utils/lineDiff'

const { before, after } = defineProps<{
  before: string
  after: string
}>()
const lines = computed(() => lineDiff(before, after))
const added = computed(() => lines.value.filter(line => line.kind === 'add').length)
const removed = computed(() => lines.value.filter(line => line.kind === 'remove').length)
</script>

<template>
  <section
    aria-label="Changes that restoring this version would make"
    class="space-y-ui-lg"
  >
    <p class="text-xs text-muted leading-relaxed">
      Compared with the live page when this preview was loaded. Restoring would add {{ added }} and remove {{ removed }} lines.
    </p>
    <p
      v-if="!added && !removed"
      class="text-sm text-muted"
    >
      This version matches the current content.
    </p>
    <div
      v-else
      class="border border-muted rounded-sm overflow-x-auto"
    >
      <div
        v-for="(line, index) in lines"
        :key="index"
        class="flex items-start gap-ui-sm px-ui-sm py-ui-xs text-xs font-mono"
        :class="line.kind === 'add' ? 'bg-diff-add/10 text-diff-add' : line.kind === 'remove' ? 'bg-error/10 text-error' : 'text-muted'"
      >
        <UIcon
          :name="line.kind === 'add' ? 'i-lucide-plus' : line.kind === 'remove' ? 'i-lucide-minus' : 'i-lucide-dot'"
          class="size-ui-md shrink-0 mt-ui-2xs"
        />
        <span class="sr-only">{{ line.kind }}</span><pre class="whitespace-pre-wrap break-words font-inherit min-w-ui-zero flex-1">{{ line.text || ' ' }}</pre>
      </div>
    </div>
  </section>
</template>
