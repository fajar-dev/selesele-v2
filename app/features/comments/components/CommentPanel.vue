<script setup lang="ts">
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import CommentComposer from '~/features/comments/components/CommentComposer.vue'
import CommentThread from '~/features/comments/components/CommentThread.vue'
import { useAuth } from '~/features/auth/composables/useAuth'
import type { CommentThreadItem } from '#shared/contracts/comment'
import type { usePageComments } from '~/features/comments/composables/usePageComments'

const props = defineProps<{ comments: ReturnType<typeof usePageComments>, userId: string, manager: boolean }>()
const { open, threads, filter, activeId, draft, draftBody, loading, loadError } = props.comments
const { state: auth } = useAuth()
const openCount = computed(() => threads.value.filter(thread => !thread.resolvedAt).length)
const resolvedCount = computed(() => threads.value.length - openCount.value)
const deleting = ref<CommentThreadItem | null>(null)
const deleteOpen = ref(false)
const filtered = computed(() => threads.value.filter(thread => filter.value === 'resolved' ? !!thread.resolvedAt : !thread.resolvedAt))
function confirmDelete(thread: CommentThreadItem) {
  deleting.value = thread
  deleteOpen.value = true
}
async function remove() {
  if (deleting.value) {
    await props.comments.remove(deleting.value.id)
  }
}
function cancelDraft() {
  draftBody.value = ''
  draft.value = null
  activeId.value = null
}
watch(activeId, async (id) => {
  await nextTick()
  if (id) {
    document.querySelector(`[data-comment-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
  }
})
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Comments"
    description="Discuss selected text with your workspace."
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :close="{ size: 'xs', class: 'text-muted' }"
    :ui="{
      content: 'w-full sm:max-w-[400px] divide-muted border-l border-muted ring-0 sm:ring-0 shadow-none sm:shadow-none',
      header: 'min-h-14 px-5 sm:px-5 py-3 gap-1',
      wrapper: 'min-w-0 flex-1',
      title: 'text-[14px] tracking-[-0.01em] font-semibold',
      description: 'sr-only',
      close: 'static',
      body: 'p-0 sm:p-0'
    }"
  >
    <template #body>
      <nav
        aria-label="Filter comments"
        class="sticky top-0 z-10 bg-default px-5 flex items-center gap-5 border-b border-muted"
      >
        <UButton
          label="Open"
          aria-label="Open"
          :aria-pressed="filter === 'open'"
          size="sm"
          color="neutral"
          variant="ghost"
          class="h-11 px-0 rounded-none border-b-2 hover:bg-transparent"
          :class="filter === 'open' ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted'"
          @click="filter = 'open'"
        >
          <template #trailing>
            <span class="text-[11px] font-normal tabular-nums text-muted">{{ openCount }}</span>
          </template>
        </UButton>
        <UButton
          label="Resolved"
          aria-label="Resolved"
          :aria-pressed="filter === 'resolved'"
          size="sm"
          color="neutral"
          variant="ghost"
          class="h-11 px-0 rounded-none border-b-2 hover:bg-transparent"
          :class="filter === 'resolved' ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted'"
          @click="filter = 'resolved'"
        >
          <template #trailing>
            <span class="text-[11px] font-normal tabular-nums text-muted">{{ resolvedCount }}</span>
          </template>
        </UButton>
      </nav>
      <UAlert
        v-if="loadError"
        title="Unable to sync comments"
        :description="loadError"
        color="error"
        class="m-5"
      />
      <section
        v-if="draft"
        aria-label="New discussion"
        class="px-5 py-5 border-b border-muted space-y-3"
      >
        <p class="ml-9 border-l-2 border-[#c68c1b]/50 pl-3 text-xs text-muted leading-relaxed line-clamp-4">
          {{ draft.quote }}
        </p>
        <div class="flex items-start gap-2.5">
          <UAvatar
            :src="auth.user?.avatar || undefined"
            :alt="auth.user?.name || auth.user?.email || 'You'"
            size="xs"
            class="mt-1 shrink-0"
            :ui="{ root: 'rounded-full', fallback: 'text-[10px] font-medium' }"
          />
          <CommentComposer
            v-model="draftBody"
            label="Write a comment…"
            submit-label="Comment"
            autofocus
            cancellable
            class="flex-1 min-w-0"
            :on-submit="comments.create"
            @cancel="cancelDraft"
          />
        </div>
      </section>
      <p
        v-if="loading && !threads.length"
        role="status"
        class="px-5 text-xs text-muted py-8"
      >
        Loading comments…
      </p>
      <div
        v-else-if="!filtered.length && !draft"
        class="px-8 pt-16 pb-10 flex flex-col items-center text-center"
      >
        <UIcon
          name="i-lucide-message-square"
          class="size-7 text-dimmed mb-5"
        />
        <p class="text-[13px] font-medium text-highlighted">
          {{ filter === 'resolved' ? 'No resolved discussions' : 'Start a conversation' }}
        </p>
        <p class="text-xs text-muted leading-relaxed max-w-60 mt-2">
          {{ filter === 'resolved' ? 'Completed discussions will appear here.' : 'Select text in the page, then choose Comment.' }}
        </p>
      </div>
      <CommentThread
        v-for="thread in filtered"
        :key="thread.id"
        :thread="thread"
        :active="activeId === thread.id"
        :can-delete="manager || thread.createdBy === userId"
        :on-reply="comments.reply"
        :on-resolve="comments.resolve"
        @select="comments.select(thread.id)"
        @jump="comments.jump(thread)"
        @delete="confirmDelete(thread)"
      />
    </template>
  </USlideover>
  <ConfirmationDialog
    v-model:open="deleteOpen"
    title="Delete discussion"
    description="This will permanently delete this discussion and all its replies."
    confirm-label="Delete"
    :on-confirm="remove"
  />
</template>
