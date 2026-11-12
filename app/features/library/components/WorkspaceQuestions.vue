<script setup lang="ts">
import DetailPanel from '~/components/ui/DetailPanel.vue'
import { useApi } from '~/core/http/useApi'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'
import type { KnowledgeAnswer } from '#shared/contracts/library'

const props = defineProps<{ workspaceId: string }>()
const { library } = useApi()
const { data: overview } = useWorkspace(props.workspaceId)
const open = useState('workspace-questions-open', () => false)
const question = ref('')
const submitted = ref('')
const answer = ref<KnowledgeAnswer | null>(null)
const busy = ref(false)
const error = ref('')
const suggestions = computed(() => (overview.value?.pages || []).slice(0, 3))
const body = useTemplateRef('body')
onBeforeUnmount(() => {
  open.value = false
})
function keydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
    event.preventDefault()
    void ask()
  }
}
async function ask(value = question.value) {
  if (busy.value || value.trim().length < 3) {
    return
  }
  submitted.value = value.trim()
  question.value = ''
  busy.value = true
  error.value = ''
  answer.value = null
  try {
    answer.value = (await library.answer(submitted.value, props.workspaceId)).data
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
    await nextTick()
    body.value?.scrollTo({ top: body.value.scrollHeight, behavior: 'smooth' })
  }
}
</script>

<template>
  <DetailPanel
    v-model:open="open"
    title="Ask workspace"
    description="Find answers in your workspace documents, with source references."
    icon="i-lucide-sparkles"
  >
    <template #body>
      <div
        ref="body"
        class="h-full overflow-y-auto px-ui-2xl py-ui-3xl"
      >
        <div
          v-if="!submitted"
          class="pt-ui-5xl sm:pt-ui-7xl"
        >
          <div class="inline-flex items-center gap-ui-sm text-xs text-muted mb-ui-2xl">
            <UIcon
              name="i-lucide-sparkles"
              class="size-ui-lg"
            />{{ overview?.workspace.name || 'Your workspace' }}
          </div>
          <h2 class="text-2xl leading-tight tracking-tight font-semibold text-highlighted max-w-ui-17xl">
            A little clarity,<br>from your own docs.
          </h2>
          <p class="text-xs text-muted leading-relaxed max-w-ui-17xl mt-ui-lg">
            Ask a question, find a decision, or catch up on a project. Follow the source pages behind each answer.
          </p>
          <div
            v-if="suggestions.length"
            class="mt-ui-5xl space-y-ui-xs"
          >
            <p class="text-xs font-medium text-muted mb-ui-md">
              START WITH A PAGE
            </p><button
              v-for="page in suggestions"
              :key="page.id"
              type="button"
              class="w-full flex items-center gap-ui-md py-ui-md px-ui-sm -mx-2 text-left border-b border-muted hover:bg-accented/30 rounded-sm"
              @click="ask(`Summarize ${page.title}`)"
            >
              <span class="text-base shrink-0">{{ page.icon || '📄' }}</span><span class="text-xs text-toned truncate">Summarize {{ page.title }}</span><UIcon
                name="i-lucide-arrow-up-right"
                class="size-ui-md text-dimmed ms-auto shrink-0"
              />
            </button>
          </div>
        </div>
        <div
          v-else
          class="space-y-ui-3xl"
        >
          <div class="flex justify-end">
            <p class="max-w-proportion-wide rounded-md bg-muted/70 px-ui-lg py-ui-md text-sm leading-relaxed">
              {{ submitted }}
            </p>
          </div>
          <section
            class="space-y-ui-lg"
            aria-label="Workspace answer"
          >
            <div class="flex items-center gap-ui-sm text-xs font-medium text-highlighted">
              <UIcon
                name="i-lucide-sparkles"
                class="size-ui-lg"
              />SeleSele <span
                v-if="busy"
                class="ms-auto text-xs font-normal text-muted"
              >Finding relevant pages…</span>
            </div>
            <div
              v-if="busy"
              class="space-y-ui-md"
              role="status"
              aria-label="Preparing an answer"
            >
              <USkeleton
                aria-hidden="true"
                class="h-ui-md w-full"
              /><USkeleton
                aria-hidden="true"
                class="h-ui-md w-proportion-wide"
              /><USkeleton
                aria-hidden="true"
                class="h-ui-md w-proportion-two-thirds"
              />
            </div>
            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              title="Couldn’t prepare an answer"
              :description="error"
              :actions="[{ label: 'Try again', onClick: () => ask(submitted) }]"
            />
            <p
              v-if="answer"
              class="text-xs leading-loose whitespace-pre-wrap text-toned"
            >
              {{ answer.answer }}
            </p>
            <div
              v-if="answer?.sources.length"
              class="pt-ui-md border-t border-muted"
            >
              <p class="text-xs font-medium text-muted mb-ui-sm">
                {{ answer.sources.length }} SOURCE {{ answer.sources.length === 1 ? 'DOCUMENT' : 'DOCUMENTS' }}
              </p><NuxtLink
                v-for="(source, index) in answer.sources"
                :key="source.id"
                :to="`/workspaces/${source.workspaceId}/pages/${source.id}`"
                class="flex items-center gap-ui-sm py-ui-sm text-xs text-toned hover:text-highlighted group"
                @click="open = false"
              ><span class="size-ui-xl inline-grid place-items-center bg-muted text-xs rounded-sm shrink-0">{{ index + 1 }}</span><span class="truncate">{{ source.title }}</span><UIcon
                name="i-lucide-arrow-up-right"
                class="size-ui-md ms-auto text-dimmed group-hover:text-toned shrink-0"
              /></NuxtLink>
            </div>
          </section>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="w-full">
        <form
          class="rounded-md border border-default bg-default focus-within:border-accented overflow-hidden"
          @submit.prevent="ask()"
        >
          <UTextarea
            v-model="question"
            autofocus
            :maxlength="1000"
            :rows="2"
            :maxrows="5"
            autoresize
            variant="none"
            class="w-full"
            aria-label="Question about your workspace"
            placeholder="Ask anything about this workspace…"
            :ui="{ base: 'px-ui-md py-ui-md text-xs ring-0 resize-none' }"
            @keydown="keydown"
          /><div class="flex items-center justify-between px-ui-md pb-ui-sm">
            <span class="text-xs text-dimmed">Ctrl / Cmd + Enter</span><UButton
              type="submit"
              aria-label="Ask question"
              icon="i-lucide-arrow-up"
              size="xs"
              class="size-ui-3xl justify-center"
              :loading="busy"
              :disabled="question.trim().length < 3"
            />
          </div>
        </form><p class="mt-ui-sm text-center text-xs text-dimmed">
          Based on pages you can access. Check the sources for details.
        </p>
      </div>
    </template>
  </DetailPanel>
</template>
