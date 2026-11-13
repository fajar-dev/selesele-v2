<script setup lang="ts">
import AppHeader from '~/components/shell/AppHeader.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useConversations } from '~/features/conversations/composables/useConversations'

const { workspaceId } = defineProps<{
  workspaceId: string
}>()
const { data: overview } = useWorkspace(workspaceId)
const { selected, list, current, loading, busy, question, pendingQuestion, inspect, create, ask, rename, remove } = useConversations(workspaceId)
const deleting = ref<string | null>(null)
const removalOpen = computed({ get: () => !!deleting.value, set: (value) => {
  if (!value) {
    deleting.value = null
  }
} })
const suggestions = computed(() => (overview.value?.pages || []).filter(page => !page.archivedAt).slice(0, 3))
function keydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
    event.preventDefault()
    void ask()
  }
}
</script>

<template>
  <div class="pb-ui-7xl app-enter">
    <AppHeader>
      <template #left>
        <PageBreadcrumbs :items="[{ label: overview?.workspace.name || 'Workspace', emoji: overview?.workspace.icon, to: `/workspaces/${workspaceId}` }, { label: 'Ask workspace', icon: 'i-lucide-sparkles' }]" />
      </template>
    </AppHeader>
    <PageContent>
      <PageHeading
        title="Ask workspace"
        description="Find answers in your documents, with sources you can follow."
      >
        <template #icon>
          <UIcon
            name="i-lucide-sparkles"
            class="size-ui-3xl"
          />
        </template>
        <template #actions>
          <UButton
            label="New conversation"
            icon="i-lucide-plus"
            :loading="busy"
            @click="create"
          />
        </template>
      </PageHeading>
      <div class="flex flex-col md:flex-row gap-ui-5xl border-t border-muted pt-ui-2xl">
        <aside
          class="md:w-ui-16xl shrink-0 space-y-ui-md"
          aria-label="Your conversations"
        >
          <h2 class="text-xs font-medium text-muted">
            Your conversations · private to you
          </h2>
          <DataSkeleton
            v-if="list.status.value === 'pending' && !list.data.value.length"
            label="Loading conversations"
            :rows="3"
          />
          <DataRetry
            v-else-if="list.error.value"
            :feedback-keys="[`conversations:${workspaceId}`]"
            :on-retry="() => list.refresh()"
          />
          <div
            v-else
            class="max-h-ui-18xl md:max-h-none overflow-y-auto space-y-ui-xs"
          >
            <div
              v-for="chat in list.data.value"
              :key="chat.id"
              class="flex items-center gap-ui-xs rounded-sm"
              :class="{ 'bg-muted': selected === chat.id }"
            >
              <NuxtLink
                :to="{ path: `/workspaces/${workspaceId}/ask`, query: { chat: chat.id } }"
                :aria-current="selected === chat.id ? 'page' : undefined"
                class="min-w-ui-zero flex-1 truncate px-ui-sm py-ui-md text-sm hover:text-highlighted"
              >{{ chat.title }}</NuxtLink>
              <UButton
                :aria-label="`Delete conversation ${chat.title}`"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                :disabled="busy"
                @click="deleting = chat.id"
              />
            </div>
            <p
              v-if="!list.data.value.length"
              class="text-xs text-muted leading-relaxed"
            >
              Your saved conversations will appear here.
            </p>
          </div>
        </aside>
        <div class="flex-1 min-w-ui-zero max-w-3xl space-y-ui-3xl">
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
            <h2
              v-if="current"
              class="text-lg font-semibold text-highlighted"
            >
              <InlineTextField
                :key="current.id"
                :value="current.title"
                label="Conversation name"
                :maxlength="120"
                :on-save="rename"
              />
            </h2>
            <div
              v-if="!current?.messages.length && !busy"
              class="space-y-ui-md"
            >
              <p class="text-sm text-muted leading-relaxed">
                Ask a question, find a decision, or catch up on a project. Only pages you can access are used.
              </p>
              <UButton
                v-for="page in suggestions"
                :key="page.id"
                color="neutral"
                variant="ghost"
                class="w-full justify-start py-ui-md px-ui-sm rounded-sm border-b border-muted"
                @click="ask(`Summarize ${page.title}`)"
              >
                <span class="text-lg shrink-0">{{ page.icon || '📄' }}</span><span class="truncate min-w-ui-zero">Summarize {{ page.title }}</span><UIcon
                  name="i-lucide-arrow-up-right"
                  class="size-ui-lg ms-auto shrink-0 text-dimmed"
                />
              </UButton>
            </div>
            <section
              aria-label="Conversation messages"
              aria-live="polite"
              :aria-busy="busy"
              class="space-y-ui-3xl"
            >
              <article
                v-for="message in current?.messages || []"
                :key="message.id"
                class="space-y-ui-md"
                :class="message.role === 'user' ? 'ms-ui-3xl border-l border-muted ps-ui-xl' : 'pb-ui-xl border-b border-muted'"
              >
                <p class="text-xs font-medium text-muted">
                  {{ message.role === 'user' ? 'You' : 'SeleSele' }}
                </p>
                <p
                  class="text-sm leading-loose whitespace-pre-wrap break-words"
                  :class="message.unavailable ? 'text-muted' : 'text-toned'"
                >
                  {{ message.content }}
                </p>
                <div
                  v-if="message.sources.length"
                  class="space-y-ui-xs"
                >
                  <p class="text-xs font-medium text-muted">
                    Sources · {{ message.sources.length }}
                  </p>
                  <NuxtLink
                    v-for="(source, index) in message.sources"
                    :key="source.id"
                    :to="`/workspaces/${source.workspaceId}/pages/${source.id}`"
                    class="flex items-center gap-ui-sm py-ui-sm text-sm text-toned hover:text-highlighted"
                  >
                    <span class="text-xs text-muted tabular-nums">{{ index + 1 }}</span><span class="truncate">{{ source.title }}</span><UIcon
                      name="i-lucide-arrow-up-right"
                      class="size-ui-md ms-auto shrink-0"
                    />
                  </NuxtLink>
                </div>
              </article>
              <div
                v-if="busy && pendingQuestion"
                class="space-y-ui-lg"
              >
                <p class="text-sm font-medium break-words">
                  {{ pendingQuestion }}
                </p><DataSkeleton
                  kind="editor"
                  label="Finding relevant pages and preparing an answer"
                  :rows="4"
                />
              </div>
            </section>
            <form
              class="rounded-md border border-default bg-default focus-within:border-accented overflow-hidden"
              @submit.prevent="ask()"
            >
              <UTextarea
                v-model="question"
                autofocus
                :maxlength="1000"
                :rows="3"
                :maxrows="8"
                autoresize
                variant="none"
                class="w-full"
                aria-label="Question about your workspace"
                placeholder="Ask anything about this workspace…"
                :readonly="busy"
                :ui="{ base: 'px-ui-lg py-ui-lg text-sm ring-0 resize-none' }"
                @keydown="keydown"
              />
              <div class="flex items-center justify-between gap-ui-md px-ui-lg pb-ui-lg">
                <span class="text-xs text-muted">Ctrl / Cmd + Enter</span><UButton
                  type="submit"
                  label="Ask question"
                  icon="i-lucide-arrow-up"
                  size="sm"
                  :loading="busy"
                  :disabled="busy || question.trim().length < 3"
                />
              </div>
            </form>
            <p class="text-xs text-muted leading-relaxed">
              Answers use pages you have access to. Check the sources for details. Up to 100 questions per conversation.
            </p>
          </template>
        </div>
      </div>
    </PageContent>
    <ConfirmationDialog
      v-model:open="removalOpen"
      title="Delete conversation"
      description="This permanently deletes this private conversation and its messages."
      :on-confirm="async () => { if (deleting) { await remove(deleting) } }"
    />
  </div>
</template>
