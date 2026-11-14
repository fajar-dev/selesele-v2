<script setup lang="ts">
defineProps<{ busy: boolean, disabled: boolean }>()
const question = defineModel<string>({ required: true })
const emit = defineEmits<{ submit: [], stop: [] }>()
</script>

<template>
  <div class="space-y-ui-md">
    <UChatPrompt
      v-model="question"
      :autofocus="false"
      :rows="2"
      :maxrows="6"
      :maxlength="1000"
      :disabled="disabled || busy"
      :submit-on-enter="true"
      placeholder="Ask anything about this workspace…"
      aria-label="Question about your workspace"
      class="rounded-md shadow-none"
      :ui="{ base: 'text-sm', footer: 'items-center' }"
      @submit="emit('submit')"
    >
      <template #footer>
        <span class="text-xs text-muted flex items-center gap-ui-xs"><UIcon
          name="i-lucide-shield-check"
          class="size-ui-md"
        /><span>Workspace sources only</span></span>
        <UButton
          v-if="busy"
          type="button"
          icon="i-lucide-square"
          label="Stop"
          color="neutral"
          variant="soft"
          class="ms-auto"
          @click="emit('stop')"
        />
        <UButton
          v-else
          type="submit"
          :icon="busy ? 'i-lucide-loader-circle' : 'i-lucide-arrow-up'"
          :loading="busy"
          :disabled="disabled || busy || question.trim().length < 3"
          aria-label="Send message"
          color="primary"
          class="ms-auto rounded-md"
        />
      </template>
    </UChatPrompt>
    <p class="text-xs text-muted leading-relaxed">
      Check the sources. AI can make mistakes. <span class="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
    </p>
  </div>
</template>
