<script setup lang="ts">
import type { ItemKind } from '#shared/kernel/content'

defineProps<{ kind: ItemKind }>()
</script>

<template>
  <div
    class="h-ui-13xl overflow-hidden bg-muted border-b border-muted px-ui-2xl py-ui-xl text-dimmed"
    aria-hidden="true"
  >
    <div
      v-if="kind === 'document'"
      class="mx-auto w-proportion-three-quarters space-y-ui-sm rounded-sm border border-default bg-default p-ui-lg"
    >
      <div class="h-ui-sm w-proportion-half bg-accented rounded-sm" />
      <div class="h-ui-xs bg-accented rounded-sm" /><div class="h-ui-xs bg-accented rounded-sm" />
      <div class="h-ui-xs w-proportion-three-fifths bg-accented rounded-sm" />
      <div class="flex gap-ui-sm pt-ui-sm">
        <UIcon
          name="i-lucide-square-check"
          class="size-ui-md"
        /><div class="h-ui-xs w-proportion-half bg-accented rounded-sm self-center" />
      </div>
    </div>
    <div
      v-else-if="kind === 'kanban'"
      class="grid grid-cols-3 gap-ui-md"
    >
      <div
        v-for="column in 3"
        :key="column"
        class="space-y-ui-sm"
      >
        <div class="flex items-center gap-ui-xs">
          <span class="size-ui-xs rounded-full bg-accented" /><span class="h-ui-xs w-proportion-half rounded-sm bg-accented" />
        </div>
        <div
          v-for="card in (column === 2 ? 1 : 2)"
          :key="card"
          class="bg-default border border-default rounded-sm p-ui-sm space-y-ui-sm"
        >
          <div class="h-ui-xs w-proportion-three-quarters rounded-sm bg-accented" /><div class="h-ui-xs w-proportion-half rounded-sm bg-accented" />
        </div>
      </div>
    </div>
    <svg
      v-else-if="kind === 'whiteboard'"
      viewBox="0 0 320 110"
      class="size-full"
      fill="none"
    >
      <path
        d="M35 35 Q70 5 100 35 T160 35"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <rect
        x="30"
        y="58"
        width="65"
        height="45"
        rx="3"
        class="fill-blue-50 stroke-blue-300 dark:fill-blue-950 dark:stroke-blue-700"
      />
      <rect
        x="124"
        y="55"
        width="65"
        height="45"
        rx="3"
        class="fill-amber-50 stroke-amber-300 dark:fill-amber-950 dark:stroke-amber-700"
      />
      <rect
        x="218"
        y="25"
        width="65"
        height="45"
        rx="3"
        class="fill-violet-50 stroke-violet-300 dark:fill-violet-950 dark:stroke-violet-700"
      />
      <path
        d="M195 70 Q230 90 245 77 M238 78 L246 76 L244 85"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      viewBox="0 0 320 110"
      class="size-full"
      fill="none"
      stroke="currentColor"
    >
      <rect
        x="5"
        y="36"
        width="70"
        height="38"
        rx="3"
        class="fill-default"
      /><path d="M75 55 H125 M120 50 L125 55 L120 60" />
      <path
        d="M160 22 L195 55 L160 88 L125 55 Z"
        class="fill-default"
      /><path d="M195 55 H235 M230 50 L235 55 L230 60" />
      <rect
        x="235"
        y="36"
        width="80"
        height="38"
        rx="19"
        class="fill-default"
      />
      <path
        d="M25 55 H55 M148 55 H172 M254 55 H296"
        opacity="0.5"
      />
    </svg>
  </div>
</template>
