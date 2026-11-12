<script setup lang="ts">
import CommentComposer from '~/features/comments/components/CommentComposer.vue'
import type { CommentThreadItem } from '#shared/contracts/comment'

const props = defineProps<{
  thread: CommentThreadItem
  active: boolean
  canDelete: boolean
  onReply: (id: string, body: string) => Promise<void>
  onResolve: (id: string, resolved: boolean) => Promise<void>
}>()
const emit = defineEmits<{ select: [], jump: [], delete: [] }>()
const firstMessage = computed(() => props.thread.messages[0])
const replies = computed(() => props.thread.messages.slice(1))
const busy = ref(false)
const error = ref('')
async function resolve() {
  if (busy.value) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    await props.onResolve(props.thread.id, !props.thread.resolvedAt)
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <article
    :data-comment-id="thread.id"
    class="group/thread px-5 py-5 border-b border-muted last:border-b-0 transition-colors"
    :class="{ 'bg-(--app-hover)': active }"
  >
    <button
      type="button"
      aria-label="Go to commented text"
      class="block w-[calc(100%-2.25rem)] ml-9 mb-4 text-left border-l-2 border-[#c68c1b]/50 pl-3 text-xs text-muted leading-relaxed line-clamp-2 hover:text-highlighted transition-colors"
      @click="emit('jump')"
    >
      {{ thread.quote }}
    </button>
    <div
      v-if="firstMessage"
      class="flex gap-2.5"
    >
      <UAvatar
        :src="firstMessage.author.avatar || undefined"
        :alt="firstMessage.author.name || firstMessage.author.email"
        size="xs"
        class="shrink-0 mt-0.5"
        :ui="{ root: 'rounded-full', fallback: 'text-[10px] font-medium' }"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1 min-h-6">
          <span
            class="truncate text-[13px] font-medium text-highlighted"
            :title="firstMessage.author.name || firstMessage.author.email"
          >{{ firstMessage.author.name || firstMessage.author.email }}</span>
          <time
            :datetime="firstMessage.createdAt"
            :title="new Date(firstMessage.createdAt).toLocaleString()"
            class="shrink-0 ml-1 mr-auto text-[11px] text-dimmed"
          >{{ formatRelativeTime(firstMessage.createdAt) }}</time>
          <UTooltip :text="thread.resolvedAt ? 'Reopen discussion' : 'Resolve discussion'">
            <UButton
              :icon="thread.resolvedAt ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
              :aria-label="thread.resolvedAt ? 'Reopen discussion' : 'Resolve discussion'"
              color="neutral"
              variant="ghost"
              size="xs"
              class="size-6 justify-center p-0 text-muted"
              :loading="busy"
              @click="resolve"
            />
          </UTooltip>
          <UDropdownMenu
            v-if="canDelete"
            :items="[{ label: 'Delete discussion', icon: 'i-lucide-trash', color: 'error', onSelect: () => emit('delete') }]"
          >
            <UButton
              icon="i-lucide-ellipsis"
              aria-label="Discussion actions"
              color="neutral"
              variant="ghost"
              size="xs"
              class="size-6 justify-center p-0 text-muted"
            />
          </UDropdownMenu>
        </div>
        <p class="text-[13px] leading-[1.65] whitespace-pre-wrap break-words mt-1">
          {{ firstMessage.body }}
        </p>
      </div>
    </div>
    <p
      v-if="error"
      role="alert"
      class="ml-9 mt-2 text-xs text-error"
    >
      {{ error }}
    </p>
    <div
      v-if="replies.length"
      class="ml-3 mt-4 border-l border-muted pl-5 space-y-4"
    >
      <div
        v-for="message in replies"
        :key="message.id"
        class="flex gap-2.5"
      >
        <UAvatar
          :src="message.author.avatar || undefined"
          :alt="message.author.name || message.author.email"
          size="2xs"
          class="shrink-0 mt-0.5"
          :ui="{ root: 'rounded-full', fallback: 'text-[9px] font-medium' }"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2">
            <span class="text-xs font-medium text-highlighted">{{ message.author.name || message.author.email }}</span>
            <time
              :datetime="message.createdAt"
              :title="new Date(message.createdAt).toLocaleString()"
              class="text-[11px] text-dimmed"
            >{{ formatRelativeTime(message.createdAt) }}</time>
          </div>
          <p class="text-[13px] leading-[1.65] whitespace-pre-wrap break-words mt-1">
            {{ message.body }}
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="!thread.resolvedAt"
      class="ml-9 mt-4"
    >
      <CommentComposer
        v-if="active"
        :key="thread.id"
        label="Write a reply…"
        submit-label="Reply"
        :on-submit="body => onReply(thread.id, body)"
      />
      <UButton
        v-else
        label="Reply…"
        color="neutral"
        variant="ghost"
        size="xs"
        class="p-0 text-xs text-dimmed hover:text-toned hover:bg-transparent"
        @click="emit('select')"
      />
    </div>
    <div
      v-else
      class="ml-9 mt-3 flex items-center gap-1 text-[11px] text-muted"
    >
      <UIcon
        name="i-lucide-check-check"
        class="size-3.5"
      />
      Resolved
    </div>
  </article>
</template>
