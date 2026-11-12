<script setup lang="ts">
defineProps<{ title: string, description?: string | null }>()
</script>

<template>
  <header
    class="flex flex-wrap items-start justify-between gap-ui-xl"
    data-workspace-heading
  >
    <div class="min-w-ui-zero flex-1 basis-ui-15xl">
      <div class="flex items-center gap-ui-md">
        <span
          v-if="$slots.icon"
          class="inline-flex size-ui-5xl shrink-0 items-center justify-center text-3xl leading-none select-none"
        >
          <slot name="icon" />
        </span>
        <h1
          :aria-label="title"
          class="min-w-ui-zero flex-1 text-3xl sm:text-3xl leading-tight tracking-tight font-semibold text-highlighted break-words"
        >
          <slot name="title">
            {{ title }}
          </slot>
        </h1>
      </div>
      <div
        v-if="description || $slots.description"
        class="text-sm text-muted leading-relaxed mt-ui-md"
      >
        <slot name="description">
          {{ description }}
        </slot>
      </div>
      <div
        v-if="$slots.metadata"
        class="flex flex-wrap items-center gap-ui-sm mt-ui-lg text-xs text-muted"
      >
        <slot name="metadata" />
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="flex shrink-0 items-center gap-ui-sm pt-ui-xs"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
