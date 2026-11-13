<script setup lang="ts">
import CommentComposer from '~/features/comments/components/CommentComposer.vue'
import type { CommentThreadItem } from '#shared/contracts/comment'

const props = defineProps<{
  thread: CommentThreadItem
  active: boolean
  canComment?: boolean
  canDelete: boolean
  onReply: (id: string, body: string) => Promise<void>
  onResolve: (id: string, resolved: boolean) => Promise<void>
}>()
const emit = defineEmits<{ select: [], jump: [], delete: [] }>()
const firstMessage = computed(() => props.thread.messages[0])
const replies = computed(() => props.thread.messages.slice(1))
const busy = ref(false)
const toast = useToast()
async function resolve() {
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    await props.onResolve(props.thread.id, !props.thread.resolvedAt)
  } catch (cause) {
    toast.add({ title: 'Unable to update discussion', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <article
    :data-comment-id="thread.id"
    class="group/thread px-ui-xl py-ui-xl border-b border-muted last:border-b-0 transition-colors"
    :class="{ 'bg-(--app-hover)': active }"
  >
    <button
      type="button"
      aria-label="Go to commented text"
      class="block w-editor-menu ml-ui-4xl mb-ui-lg text-left border-l-2 border-comment/50 pl-ui-md text-xs text-muted leading-relaxed line-clamp-2 hover:text-highlighted transition-colors"
      @click="emit('jump')"
    >
      {{ thread.quote }}
    </button>
    <div
      v-if="firstMessage"
      class="flex gap-ui-sm"
    >
      <UAvatar
        :src="firstMessage.author.avatar || undefined"
        :alt="firstMessage.author.name || firstMessage.author.email"
        size="xs"
        class="shrink-0 mt-ui-2xs"
        :ui="{ root: 'rounded-full', fallback: 'text-xs font-medium' }"
      />
      <div class="min-w-ui-zero flex-1">
        <div class="flex items-center gap-ui-xs min-h-ui-2xl">
          <span
            class="truncate text-xs font-medium text-highlighted"
            :title="firstMessage.author.name || firstMessage.author.email"
          >{{ firstMessage.author.name || firstMessage.author.email }}</span>
          <time
            :datetime="firstMessage.createdAt"
            :title="new Date(firstMessage.createdAt).toLocaleString()"
            class="shrink-0 ml-ui-xs mr-auto text-xs text-dimmed"
          >{{ formatRelativeTime(firstMessage.createdAt) }}</time>
          <UTooltip
            v-if="canComment !== false"
            :text="thread.resolvedAt ? 'Reopen discussion' : 'Resolve discussion'"
          >
            <UButton
              :icon="thread.resolvedAt ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
              :aria-label="thread.resolvedAt ? 'Reopen discussion' : 'Resolve discussion'"
              color="neutral"
              variant="ghost"
              size="xs"
              class="size-ui-2xl justify-center p-ui-zero text-muted"
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
              class="size-ui-2xl justify-center p-ui-zero text-muted"
            />
          </UDropdownMenu>
        </div>
        <p class="text-xs leading-relaxed whitespace-pre-wrap break-words mt-ui-xs">
          {{ firstMessage.body }}
        </p>
      </div>
    </div>
    <div
      v-if="replies.length"
      class="ml-ui-md mt-ui-lg border-l border-muted pl-ui-xl space-y-ui-lg"
    >
      <div
        v-for="message in replies"
        :key="message.id"
        class="flex gap-ui-sm"
      >
        <UAvatar
          :src="message.author.avatar || undefined"
          :alt="message.author.name || message.author.email"
          size="2xs"
          class="shrink-0 mt-ui-2xs"
          :ui="{ root: 'rounded-full', fallback: 'text-xs font-medium' }"
        />
        <div class="min-w-ui-zero flex-1">
          <div class="flex flex-wrap items-baseline gap-x-ui-sm">
            <span class="text-xs font-medium text-highlighted">{{ message.author.name || message.author.email }}</span>
            <time
              :datetime="message.createdAt"
              :title="new Date(message.createdAt).toLocaleString()"
              class="text-xs text-dimmed"
            >{{ formatRelativeTime(message.createdAt) }}</time>
          </div>
          <p class="text-xs leading-relaxed whitespace-pre-wrap break-words mt-ui-xs">
            {{ message.body }}
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="!thread.resolvedAt"
      class="ml-ui-4xl mt-ui-lg"
    >
      <CommentComposer
        v-if="active && canComment !== false"
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
        class="p-ui-zero text-xs text-dimmed hover:text-toned hover:bg-transparent"
        @click="emit('select')"
      />
    </div>
    <div
      v-else
      class="ml-ui-4xl mt-ui-md flex items-center gap-ui-xs text-xs text-muted"
    >
      <UIcon
        name="i-lucide-check-check"
        class="size-ui-md"
      />
      Resolved
    </div>
  </article>
</template>
