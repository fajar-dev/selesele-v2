<script setup lang="ts">
import AppHeader from '~/components/shell/AppHeader.vue'
import PageBreadcrumbs from '~/components/ui/PageBreadcrumbs.vue'
import PageContent from '~/components/ui/PageContent.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import DataRetry from '~/components/ui/DataRetry.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import { useWorkspaceQuestions } from '../composables/useWorkspaceQuestions'

const { workspaceId } = defineProps<{ workspaceId: string }>()
const { data: overview, pagesLoading } = useWorkspace(workspaceId)
const { question, submitted, answer, busy, error, ask } = useWorkspaceQuestions(workspaceId)
const suggestions = computed(() => (overview.value?.pages || []).slice(0, 3))
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
      <div class="max-w-3xl mx-auto space-y-ui-4xl">
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
        </PageHeading>
        <div class="space-y-ui-md">
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
              :ui="{ base: 'px-ui-lg py-ui-lg text-sm ring-0 resize-none' }"
              @keydown="keydown"
            />
            <div class="flex items-center justify-between gap-ui-md px-ui-lg pb-ui-lg">
              <span class="text-xs text-muted">Ctrl / Cmd + Enter</span>
              <UButton
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
            Answers use pages you have access to. Check the sources for details.
          </p>
        </div>
        <section
          v-if="!submitted && suggestions.length"
          aria-label="Suggested questions"
          class="space-y-ui-md"
        >
          <h2 class="text-sm font-medium text-toned">
            Start with a page
          </h2>
          <div class="divide-y divide-muted">
            <UButton
              v-for="page in suggestions"
              :key="page.id"
              color="neutral"
              variant="ghost"
              class="w-full justify-start py-ui-md px-ui-sm rounded-sm"
              @click="ask(`Summarize ${page.title}`)"
            >
              <span class="text-lg shrink-0">{{ page.icon || '📄' }}</span>
              <span class="truncate min-w-ui-zero text-sm">Summarize {{ page.title }}</span>
              <UIcon
                name="i-lucide-arrow-up-right"
                class="size-ui-lg text-dimmed ms-auto shrink-0"
              />
            </UButton>
          </div>
        </section>
        <DataSkeleton
          v-else-if="!submitted && pagesLoading"
          label="Loading suggested pages"
          :rows="3"
        />
        <section
          v-if="submitted"
          aria-label="Workspace answer"
          aria-live="polite"
          :aria-busy="busy"
          class="border-t border-muted pt-ui-3xl space-y-ui-xl"
        >
          <h2 class="text-lg font-semibold text-highlighted break-words">
            {{ submitted }}
          </h2>
          <DataSkeleton
            v-if="busy"
            kind="editor"
            label="Finding relevant pages and preparing an answer"
            :rows="5"
          />
          <DataRetry
            v-else-if="error"
            :feedback-keys="[`workspace-answer:${workspaceId}`]"
            :on-retry="() => ask(submitted)"
          />
          <template v-else-if="answer">
            <p class="text-sm leading-loose whitespace-pre-wrap break-words text-toned">
              {{ answer.answer }}
            </p>
            <div
              v-if="answer.sources.length"
              class="pt-ui-xl border-t border-muted space-y-ui-sm"
            >
              <h3 class="text-xs font-medium text-muted">
                Sources · {{ answer.sources.length }}
              </h3>
              <NuxtLink
                v-for="(source, index) in answer.sources"
                :key="source.id"
                :to="`/workspaces/${source.workspaceId}/pages/${source.id}`"
                class="flex items-center gap-ui-md px-ui-sm py-ui-md text-sm text-toned hover:bg-muted rounded-sm group"
              >
                <span class="size-ui-2xl inline-grid place-items-center bg-muted text-xs rounded-sm shrink-0">{{ index + 1 }}</span>
                <span class="truncate">{{ source.title }}</span>
                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="size-ui-lg ms-auto text-dimmed group-hover:text-toned shrink-0"
                />
              </NuxtLink>
            </div>
          </template>
        </section>
      </div>
    </PageContent>
  </div>
</template>
