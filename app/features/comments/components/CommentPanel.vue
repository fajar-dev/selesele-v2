<script setup lang="ts">
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
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
      content: 'w-full sm:max-w-popup-md divide-muted border-l border-muted ring-0 sm:ring-0 shadow-none sm:shadow-none',
      header: 'min-h-ui-7xl px-ui-xl sm:px-ui-xl py-ui-md gap-ui-xs',
      wrapper: 'min-w-ui-zero flex-1',
      title: 'text-sm tracking-tight font-semibold',
      description: 'sr-only',
      close: 'static',
      body: 'p-ui-zero sm:p-ui-zero'
    }"
  >
    <template #body>
      <nav
        aria-label="Filter comments"
        class="sticky top-ui-zero z-10 bg-default px-ui-xl flex items-center gap-ui-xl border-b border-muted"
      >
        <UButton
          label="Open"
          aria-label="Open"
          :aria-pressed="filter === 'open'"
          size="sm"
          color="neutral"
          variant="ghost"
          class="h-ui-5xl px-ui-zero rounded-none border-b-2 hover:bg-transparent"
          :class="filter === 'open' ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted'"
          @click="filter = 'open'"
        >
          <template #trailing>
            <span class="text-xs font-normal tabular-nums text-muted">{{ openCount }}</span>
          </template>
        </UButton>
        <UButton
          label="Resolved"
          aria-label="Resolved"
          :aria-pressed="filter === 'resolved'"
          size="sm"
          color="neutral"
          variant="ghost"
          class="h-ui-5xl px-ui-zero rounded-none border-b-2 hover:bg-transparent"
          :class="filter === 'resolved' ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted'"
          @click="filter = 'resolved'"
        >
          <template #trailing>
            <span class="text-xs font-normal tabular-nums text-muted">{{ resolvedCount }}</span>
          </template>
        </UButton>
      </nav>
      <UAlert
        v-if="loadError"
        title="Unable to sync comments"
        :description="loadError"
        color="error"
        class="m-ui-xl"
      />
      <section
        v-if="draft"
        aria-label="New discussion"
        class="px-ui-xl py-ui-xl border-b border-muted space-y-ui-md"
      >
        <p class="ml-ui-4xl border-l-2 border-comment/50 pl-ui-md text-xs text-muted leading-relaxed line-clamp-4">
          {{ draft.quote }}
        </p>
        <div class="flex items-start gap-ui-sm">
          <UAvatar
            :src="auth.user?.avatar || undefined"
            :alt="auth.user?.name || auth.user?.email || 'You'"
            size="xs"
            class="mt-ui-xs shrink-0"
            :ui="{ root: 'rounded-full', fallback: 'text-xs font-medium' }"
          />
          <CommentComposer
            v-model="draftBody"
            label="Write a comment…"
            submit-label="Comment"
            autofocus
            cancellable
            class="flex-1 min-w-ui-zero"
            :on-submit="comments.create"
            @cancel="cancelDraft"
          />
        </div>
      </section>
      <DataSkeleton
        v-if="loading && !threads.length"
        label="Loading comments"
        class="px-ui-xl py-ui-2xl"
        :rows="4"
      />
      <div
        v-else-if="!filtered.length && !draft"
        class="px-ui-4xl pt-ui-8xl pb-ui-5xl flex flex-col items-center text-center"
      >
        <UIcon
          name="i-lucide-message-square"
          class="size-ui-3xl text-dimmed mb-ui-xl"
        />
        <p class="text-xs font-medium text-highlighted">
          {{ filter === 'resolved' ? 'No resolved discussions' : 'Start a conversation' }}
        </p>
        <p class="text-xs text-muted leading-relaxed max-w-ui-15xl mt-ui-sm">
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
