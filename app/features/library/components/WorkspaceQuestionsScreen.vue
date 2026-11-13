<script setup lang="ts">
import AppHeader from '~/components/shell/AppHeader.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import ConversationHistory from '~/features/conversations/components/ConversationHistory.vue'
import WorkspaceChatMessage from '~/features/conversations/components/WorkspaceChatMessage.vue'
import WorkspaceChatComposer from '~/features/conversations/components/WorkspaceChatComposer.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useConversations } from '~/features/conversations/composables/useConversations'

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { data: overview } = useWorkspace(workspaceId)
const { selected, list, current, loading, busy, question, pendingQuestion, inspect, create, ask, rename, remove } = useConversations(workspaceId)
const deleting = ref<string | null>(null)
const viewport = useTemplateRef<HTMLDivElement>('viewport')
const atBottom = ref(true)
const suggestions = computed(() => (overview.value?.items || []).filter(item => !item.archivedAt).slice(0, 3))
const removalOpen = computed({ get: () => !!deleting.value, set: (value) => {
  if (!value) {
    deleting.value = null
  }
} })
function measureScroll() {
  const element = viewport.value
  atBottom.value = !element || element.scrollHeight - element.scrollTop <= element.clientHeight + 48
}
function scrollToLatest() {
  if (viewport.value) {
    viewport.value.scrollTop = viewport.value.scrollHeight
  }
  atBottom.value = true
}
watch([() => current.value?.messages.length, busy, loading, selected], async (_value, previous) => {
  const follow = atBottom.value || selected.value !== previous[3] || busy.value
  await nextTick()
  if (follow) {
    scrollToLatest()
  }
})
</script>

<template>
  <div class="flex flex-col h-viewport min-h-ui-zero app-enter overflow-hidden">
    <AppHeader class="shrink-0">
      <template #left>
        <Breadcrumbs :items="[{ label: overview?.workspace.name || 'Workspace', emoji: overview?.workspace.icon, to: `/workspaces/${workspaceId}` }, { label: 'Ask workspace', icon: 'i-lucide-sparkles' }]" />
      </template>
    </AppHeader>
    <div class="workspace-content workspace-content-start flex flex-col flex-1 min-h-ui-zero gap-ui-2xl">
      <ScreenHeading
        title="Ask workspace"
        description="Find answers, connect ideas, and catch up using the items in your workspace."
        class="shrink-0"
      >
        <template #icon>
          <UIcon
            name="i-lucide-sparkles"
            class="size-ui-3xl"
          />
        </template>
        <template #actions>
          <UButton
            label="New chat"
            icon="i-lucide-plus"
            :disabled="busy || loading"
            @click="create"
          />
        </template>
      </ScreenHeading>
      <div class="flex flex-col md:flex-row flex-1 min-h-ui-zero gap-ui-2xl border-t border-muted">
        <ConversationHistory
          id="conversation-history"
          :workspace-id="workspaceId"
          :conversations="list.data.value"
          :selected="selected"
          :loading="list.status.value === 'pending'"
          :failed="!!list.error.value"
          :busy="busy"
          :retry="() => list.refresh()"
          @remove="deleting = $event"
        />
        <div class="relative flex flex-col flex-1 min-w-ui-zero min-h-ui-zero">
          <div class="flex items-center gap-ui-sm border-b border-muted py-ui-md shrink-0">
            <UIcon
              name="i-lucide-messages-square"
              class="size-ui-lg text-muted shrink-0"
            />
            <h2 class="min-w-ui-zero flex-1 text-sm font-medium text-highlighted truncate">
              <InlineTextField
                v-if="current"
                :key="current.id"
                :value="current.title"
                label="Conversation name"
                :maxlength="120"
                :on-save="rename"
              />
              <span v-else>New conversation</span>
            </h2>
          </div>
          <div
            ref="viewport"
            class="flex-1 min-h-ui-zero overflow-y-auto overscroll-contain"
            tabindex="0"
            aria-label="Conversation"
            @scroll.passive="measureScroll"
          >
            <div class="mx-auto max-w-conversation py-ui-2xl flex flex-col">
              <DataSkeleton
                v-if="loading"
                kind="editor"
                label="Loading conversation"
                :rows="5"
              />
              <DataRetry
                v-else-if="selected && !current"
                :on-retry="() => inspect(selected)"
              />
              <template v-else>
                <section
                  v-if="!current?.messages.length && !busy"
                  class="py-ui-xl space-y-ui-2xl"
                  aria-label="Start a conversation"
                >
                  <div class="space-y-ui-sm">
                    <h2 class="text-base font-semibold text-highlighted">
                      Explore your workspace
                    </h2>
                    <p class="text-sm text-muted leading-relaxed">
                      Choose a question below or ask your own. Answers include sources you can open.
                    </p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-ui-md">
                    <UButton
                      v-for="entry in [{ icon: 'i-lucide-list-checks', title: 'Catch me up', description: 'Summarize key priorities', question: 'Summarize the key priorities across this workspace.' }, { icon: 'i-lucide-lightbulb', title: 'Connect the dots', description: 'Find related ideas and decisions', question: 'What related ideas and decisions appear across this workspace?' }, { icon: 'i-lucide-compass', title: 'Find a next step', description: 'Surface open questions and actions', question: 'What open questions or next steps are described in this workspace?' }]"
                      :key="entry.title"
                      color="neutral"
                      variant="outline"
                      class="workspace-card surface-card h-full items-start flex-col gap-ui-md p-ui-lg rounded-md text-start whitespace-normal font-normal"
                      @click="ask(entry.question)"
                    >
                      <UIcon
                        :name="entry.icon"
                        class="size-ui-xl text-muted"
                      />
                      <span class="space-y-ui-xs">
                        <span class="block text-sm font-medium text-highlighted">{{ entry.title }}</span>
                        <span class="block text-xs text-muted leading-relaxed">{{ entry.description }}</span>
                      </span>
                    </UButton>
                  </div>
                  <div
                    v-if="suggestions.length"
                    class="space-y-ui-sm"
                  >
                    <p class="text-xs text-muted">
                      Or start with an item
                    </p>
                    <div class="flex flex-wrap gap-ui-sm">
                      <UButton
                        v-for="item in suggestions"
                        :key="item.id"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        class="max-w-full"
                        @click="ask(`Summarize ${item.title}`)"
                      >
                        <span>{{ item.icon || '📄' }}</span><span class="truncate">{{ item.title }}</span><UIcon
                          name="i-lucide-arrow-up-right"
                          class="size-ui-md text-dimmed shrink-0"
                        />
                      </UButton>
                    </div>
                  </div>
                </section>
                <section
                  aria-label="Conversation messages"
                  aria-live="polite"
                  :aria-busy="busy"
                  class="space-y-ui-xl"
                >
                  <WorkspaceChatMessage
                    v-for="message in current?.messages || []"
                    :key="message.id"
                    :message="message"
                  />
                  <template v-if="busy && pendingQuestion">
                    <UChatMessage
                      id="pending-question"
                      role="user"
                      :parts="[{ type: 'text', text: pendingQuestion }]"
                      side="right"
                      variant="soft"
                      :ui="{ content: 'chat-message-body text-sm' }"
                    />
                    <div
                      role="status"
                      class="flex items-center gap-ui-md py-ui-xl text-sm text-muted"
                    >
                      <UIcon
                        name="i-lucide-loader-circle"
                        class="size-ui-xl animate-spin motion-reduce:animate-none"
                      /><span>Reading workspace sources…</span>
                    </div>
                  </template>
                </section>
              </template>
            </div>
          </div>
          <div class="shrink-0 bg-default pt-ui-md pb-ui-xl relative">
            <div
              v-if="!atBottom"
              class="flex justify-center mb-ui-sm"
            >
              <UButton
                icon="i-lucide-arrow-down"
                label="Latest messages"
                color="neutral"
                variant="outline"
                size="xs"
                @click="scrollToLatest"
              />
            </div>
            <WorkspaceChatComposer
              v-model="question"
              :busy="busy"
              :disabled="loading || !!selected && !current"
              class="mx-auto max-w-conversation"
              @submit="ask()"
            />
          </div>
        </div>
      </div>
    </div>
    <ConfirmationDialog
      v-model:open="removalOpen"
      title="Delete conversation"
      description="This permanently deletes this private conversation and its messages."
      :on-confirm="async () => { if (deleting) await remove(deleting) }"
    />
  </div>
</template>
