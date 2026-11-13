<script setup lang="ts">
import type { ConversationSummary } from '#shared/kernel/conversation'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import DataRetry from '~/components/ui/DataRetry.vue'

defineProps<{
  workspaceId: string
  conversations: ConversationSummary[]
  selected: string | null
  loading: boolean
  failed: boolean
  busy: boolean
  retry: () => Promise<unknown>
}>()
const emit = defineEmits<{ remove: [id: string] }>()
const search = ref('')
</script>

<template>
  <aside
    class="shrink-0 md:w-ui-16xl md:pe-ui-xl py-ui-lg space-y-ui-lg max-h-ui-16xl md:max-h-none overflow-y-auto"
    aria-label="Conversation history"
  >
    <div class="flex items-center justify-between gap-ui-sm">
      <h2 class="text-xs font-medium text-muted">
        Your conversations
      </h2>
    </div>
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search chats…"
      aria-label="Search conversations"
      size="sm"
      class="w-full"
    />
    <DataSkeleton
      v-if="loading && !conversations.length"
      label="Loading conversations"
      :rows="3"
    />
    <DataRetry
      v-else-if="failed"
      :feedback-keys="[`conversations:${workspaceId}`]"
      :on-retry="retry"
    />
    <div
      v-else
      class="space-y-ui-xs"
    >
      <div
        v-for="chat in conversations.filter(chat => chat.title.toLowerCase().includes(search.trim().toLowerCase()))"
        :key="chat.id"
        class="group flex items-center gap-ui-xs rounded-sm hover:bg-accented/30"
        :class="{ 'bg-accented/40': selected === chat.id }"
      >
        <NuxtLink
          :to="{ path: `/workspaces/${workspaceId}/ask`, query: { chat: chat.id } }"
          :aria-current="selected === chat.id ? 'page' : undefined"
          class="min-w-ui-zero flex-1 truncate px-ui-sm py-ui-md text-sm text-toned"
          :class="{ 'pointer-events-none opacity-50': busy }"
          :aria-disabled="busy"
          :tabindex="busy ? -1 : undefined"
        >{{ chat.title }}</NuxtLink>
        <UButton
          :aria-label="`Delete conversation ${chat.title}`"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          class="md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          :disabled="busy"
          @click="emit('remove', chat.id)"
        />
      </div>
      <p
        v-if="!conversations.length"
        class="text-xs text-muted leading-relaxed px-ui-sm py-ui-md"
      >
        Your conversations are private. Start one to see it here.
      </p>
      <p
        v-else-if="!conversations.some(chat => chat.title.toLowerCase().includes(search.trim().toLowerCase()))"
        class="text-xs text-muted px-ui-sm py-ui-md"
      >
        No matching conversations.
      </p>
    </div>
  </aside>
</template>
