<script setup lang="ts">
import { renderChatMarkdown } from '../utils/renderChatMarkdown'
import type { ConversationDetail } from '#shared/kernel/conversation'

const { message } = defineProps<{ message: ConversationDetail['messages'][number] }>()
const toast = useToast()
const html = computed(() => message.role === 'assistant' && !message.unavailable ? renderChatMarkdown(message.content) : null)
async function copy() {
  try {
    await navigator.clipboard.writeText(message.content)
    toast.add({ title: 'Message copied', color: 'success' })
  } catch {
    toast.add({ title: 'Unable to copy message', description: 'Your browser may not allow clipboard access.', color: 'error' })
  }
}
</script>

<template>
  <UChatMessage
    :id="message.id"
    :role="message.role"
    :parts="[{ type: 'text', text: message.content }]"
    :side="message.role === 'user' ? 'right' : 'left'"
    :variant="message.role === 'user' ? 'soft' : 'naked'"
    :icon="message.role === 'assistant' ? 'i-lucide-sparkles' : undefined"
    :ui="{ root: 'py-ui-lg', body: 'min-w-ui-zero', content: 'chat-message-body text-sm', leading: 'mt-ui-xs', leadingIcon: 'size-ui-xl text-toned', container: 'gap-ui-md', actions: 'static opacity-100! mt-ui-md w-full' }"
  >
    <template #content>
      <!-- HTML is produced by the restricted Markdown renderer, never passed through from the model. -->
      <!-- eslint-disable vue/no-v-html -- renderChatMarkdown escapes HTML, blocks unsafe URLs and disables images; security cases are tested. -->
      <div
        v-if="html"
        class="chat-markdown"
        v-html="html"
      />
      <!-- eslint-enable vue/no-v-html -->
      <p
        v-else
        :class="message.unavailable ? 'text-muted' : 'text-toned'"
      >
        {{ message.content }}
      </p>
    </template>
    <template #actions>
      <div class="space-y-ui-md w-full">
        <div
          v-if="message.sources.length"
          class="flex flex-wrap gap-ui-sm"
          aria-label="Answer sources"
        >
          <UButton
            v-for="(source, index) in message.sources"
            :key="source.id"
            :to="`/workspaces/${source.workspaceId}/items/${source.id}`"
            color="neutral"
            variant="outline"
            size="xs"
            class="max-w-full rounded-sm"
            trailing-icon="i-lucide-arrow-up-right"
          >
            <span class="text-dimmed tabular-nums">{{ index + 1 }}</span><span class="truncate">{{ source.title }}</span>
          </UButton>
        </div>
        <UButton
          v-if="!message.unavailable"
          icon="i-lucide-copy"
          aria-label="Copy message"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="copy"
        />
      </div>
    </template>
  </UChatMessage>
</template>
