<script setup lang="ts">
defineProps<{ title: string, description?: string | null }>()
</script>

<template>
  <header
    class="flex flex-wrap items-start justify-between gap-5"
    data-workspace-heading
  >
    <div class="min-w-0 flex-1 basis-60">
      <div class="flex items-center gap-3">
        <span
          v-if="$slots.icon"
          class="inline-flex size-10 shrink-0 items-center justify-center text-[2rem] leading-none select-none"
        >
          <slot name="icon" />
        </span>
        <h1
          :aria-label="title"
          class="min-w-0 flex-1 text-3xl sm:text-[2rem] leading-tight tracking-[-0.035em] font-semibold text-highlighted break-words"
        >
          <slot name="title">
            {{ title }}
          </slot>
        </h1>
      </div>
      <div
        v-if="description"
        class="text-sm text-muted leading-relaxed mt-3"
      >
        {{ description }}
      </div>
      <div
        v-if="$slots.metadata"
        class="flex flex-wrap items-center gap-2.5 mt-4 text-xs text-muted"
      >
        <slot name="metadata" />
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="flex shrink-0 items-center gap-2 pt-1"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
