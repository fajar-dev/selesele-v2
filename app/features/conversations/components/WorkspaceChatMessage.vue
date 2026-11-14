<script setup lang="ts">
import { renderChatMarkdown } from '../utils/renderChatMarkdown'
import type { ConversationDetail } from '#shared/kernel/conversation'

const { message } = defineProps<{ message: ConversationDetail['messages'][number] }>()
const toast = useToast()
const preview = ref<ConversationDetail['messages'][number]['sources'][number] | null>(null)
const previewOpen = computed({ get: () => !!preview.value, set: (value) => {
  if (!value) {
    preview.value = null
  }
} })
const html = computed(() => message.role === 'assistant' && !message.unavailable ? renderChatMarkdown(message.content, message.sources.length) : null)
function openCitation(event: MouseEvent) {
  const link = event.target instanceof Element ? event.target.closest('a') : null
  const match = link?.getAttribute('href')?.match(/^#workspace-source-(\d+)$/)
  if (!match) {
    return
  }
  const source = message.sources[Number(match[1]) - 1]
  if (source) {
    event.preventDefault()
    preview.value = source
  }
}
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
    @click="openCitation"
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
            color="neutral"
            variant="outline"
            size="xs"
            class="max-w-full rounded-sm"
            trailing-icon="i-lucide-arrow-up-right"
            @click="preview = source"
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
  <UModal
    v-model:open="previewOpen"
    :title="preview?.title || 'Answer source'"
    description="Workspace excerpt used to prepare this answer."
  >
    <template #body>
      <p class="text-sm text-toned whitespace-pre-wrap leading-relaxed">
        {{ preview?.excerpt || 'This older answer has no saved excerpt. Open the item to review the source.' }}
      </p>
    </template>
    <template #footer>
      <UButton
        v-if="preview"
        :to="`/workspaces/${preview.workspaceId}/items/${preview.id}`"
        label="Open source item"
        trailing-icon="i-lucide-arrow-up-right"
      />
    </template>
  </UModal>
</template>
