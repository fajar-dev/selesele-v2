<script setup lang="ts">
withDefaults(defineProps<{ title: string, description: string, icon: string, wide?: boolean }>(), { wide: false })
const open = defineModel<boolean>('open', { default: false })
const content = { onInteractOutside: (event: Event) => event.preventDefault() }
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="title"
    :description="description"
    :modal="false"
    :overlay="false"
    :content="content"
    :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
    :ui="{ content: wide ? 'w-full sm:max-w-panel-lg divide-muted border-l border-muted ring-0 shadow-panel' : 'w-full sm:max-w-panel-md divide-muted border-l border-muted ring-0 shadow-panel', header: 'min-h-ui-8xl px-ui-xl sm:px-ui-xl py-ui-lg gap-ui-md', wrapper: 'flex-1 min-w-ui-zero', title: 'text-sm font-semibold tracking-tight', description: 'sr-only', close: 'static text-muted', body: 'p-ui-zero sm:p-ui-zero min-h-ui-zero', footer: 'px-ui-xl sm:px-ui-xl py-ui-lg' }"
  >
    <template
      v-if="$slots.default"
      #default
    >
      <slot />
    </template>
    <template #title>
      <span class="flex items-center gap-ui-sm"><UIcon
        :name="icon"
        class="size-ui-lg text-muted"
      />{{ title }}</span>
    </template>
    <template #body>
      <slot name="body" />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </USlideover>
</template>
