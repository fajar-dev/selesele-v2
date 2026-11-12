<script setup lang="ts">
withDefaults(defineProps<{ label?: string, kind?: 'heading' | 'rows' | 'editor', rows?: number }>(), {
  label: 'Loading data', kind: 'rows', rows: 4
})
</script>

<template>
  <div
    role="status"
    :aria-label="label"
    aria-busy="true"
    :data-skeleton="kind"
    class="space-y-4 motion-reduce:animate-none"
  >
    <span class="sr-only">{{ label }}</span>
    <template v-if="kind === 'heading'">
      <div class="flex items-center gap-3">
        <USkeleton class="size-10 rounded-[4px] shrink-0" />
        <USkeleton class="h-9 w-64 max-w-[70%] rounded-[3px]" />
      </div>
      <USkeleton class="h-4 w-80 max-w-[85%] rounded-[3px]" />
    </template>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row"
        class="flex items-center gap-3 py-2"
      >
        <USkeleton
          v-if="kind === 'rows'"
          class="size-5 shrink-0 rounded-[3px]"
        />
        <USkeleton
          class="h-4 rounded-[3px]"
          :class="row % 3 === 0 ? 'w-1/2' : row % 2 === 0 ? 'w-2/3' : 'w-5/6'"
        />
      </div>
    </template>
  </div>
</template>
