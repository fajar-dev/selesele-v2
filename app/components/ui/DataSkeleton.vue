<script setup lang="ts">
withDefaults(defineProps<{ label?: string, kind?: 'heading' | 'rows' | 'editor' | 'cards', rows?: number }>(), {
  label: 'Loading data', kind: 'rows', rows: 4
})
</script>

<template>
  <div
    role="status"
    :aria-label="label"
    aria-busy="true"
    :data-skeleton="kind"
    class="space-y-ui-lg motion-reduce:animate-none"
  >
    <span class="sr-only">{{ label }}</span>
    <template v-if="kind === 'heading'">
      <div class="flex items-center gap-ui-md">
        <USkeleton
          aria-hidden="true"
          class="size-ui-5xl rounded-sm shrink-0"
        />
        <USkeleton
          aria-hidden="true"
          class="h-ui-4xl w-ui-16xl max-w-proportion-two-thirds rounded-sm"
        />
      </div>
      <USkeleton
        aria-hidden="true"
        class="h-ui-lg w-ui-18xl max-w-proportion-wide rounded-sm"
      />
    </template>
    <div
      v-else-if="kind === 'cards'"
      class="grid sm:grid-cols-2 gap-ui-lg"
    >
      <div
        v-for="row in rows"
        :key="row"
        class="border border-muted rounded-md p-ui-xl space-y-ui-xl"
      >
        <div class="flex items-center gap-ui-md">
          <USkeleton
            aria-hidden="true"
            class="size-ui-5xl shrink-0"
          />
          <USkeleton
            aria-hidden="true"
            class="h-ui-lg w-proportion-three-fifths"
          />
        </div>
        <div class="flex items-center justify-between">
          <USkeleton
            aria-hidden="true"
            class="h-ui-md w-ui-6xl"
          />
          <USkeleton
            aria-hidden="true"
            class="size-ui-lg"
          />
        </div>
      </div>
    </div>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row"
        class="flex items-center gap-ui-md py-ui-sm"
      >
        <USkeleton
          v-if="kind === 'rows'"
          aria-hidden="true"
          class="size-ui-4xl shrink-0 rounded-sm"
        />
        <div
          v-if="kind === 'rows'"
          class="flex-1 space-y-ui-sm"
        >
          <USkeleton
            aria-hidden="true"
            class="h-ui-md"
            :class="row % 2 === 0 ? 'w-proportion-two-thirds' : 'w-proportion-four-fifths'"
          />
          <USkeleton
            aria-hidden="true"
            class="h-ui-sm w-proportion-two-fifths"
          />
        </div>
        <USkeleton
          v-else
          aria-hidden="true"
          class="h-ui-lg rounded-sm"
          :class="row % 3 === 0 ? 'w-proportion-half' : row % 2 === 0 ? 'w-proportion-two-thirds' : 'w-proportion-wide'"
        />
      </div>
    </template>
  </div>
</template>
