<script setup lang="ts">
const { connected } = useNuxtApp().$realtime
</script>

<template>
  <UTooltip :text="connected ? 'Workspace changes sync automatically' : 'Reconnecting; your unsaved draft is preserved'">
    <span
      role="status"
      :aria-label="connected ? 'Workspace live' : 'Workspace reconnecting'"
      class="inline-flex items-center justify-center size-ui-3xl rounded-md text-muted"
    >
      <UIcon
        :name="connected ? 'i-lucide-wifi' : 'i-lucide-loader-circle'"
        class="size-ui-lg"
        :class="{ 'animate-spin': !connected }"
        aria-hidden="true"
      />
    </span>
  </UTooltip>
</template>
