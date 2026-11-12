<script setup lang="ts">
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'

const route = useRoute()
const { data: workspace } = useWorkspace(String(route.params.workspaceId))
const mentions = computed(() => (workspace.value?.members || []).map(member => ({ label: member.name || member.email, description: member.email, onSelect: () => {
  body.value += `@${member.email} `
} })))
const props = withDefaults(defineProps<{ label: string, submitLabel?: string, autofocus?: boolean, cancellable?: boolean, onSubmit: (body: string) => Promise<void> }>(), { submitLabel: 'Send', autofocus: false, cancellable: false })
const emit = defineEmits<{ cancel: [] }>()
const body = defineModel<string>({ default: '' })
const busy = ref(false)
const error = ref('')
const input = useTemplateRef('input')
onMounted(() => {
  if (props.autofocus) {
    input.value?.textareaRef?.focus()
  }
})
function keydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}
async function submit() {
  if (busy.value || !body.value.trim()) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    await props.onSubmit(body.value.trim())
    body.value = ''
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form
    class="comment-composer overflow-hidden rounded-md border border-default bg-default transition-colors focus-within:border-accented"
    @submit.prevent="submit"
  >
    <UTextarea
      ref="input"
      v-model="body"
      :aria-label="label"
      :placeholder="label"
      :maxlength="5000"
      :readonly="busy"
      :rows="2"
      :maxrows="8"
      variant="none"
      autoresize
      class="w-full"
      :ui="{ base: 'resize-none rounded-none border-0 bg-transparent px-ui-md pt-ui-sm pb-ui-xs text-xs leading-normal ring-0 shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-dimmed' }"
      @keydown="keydown"
    />
    <p
      v-if="error"
      role="alert"
      class="px-ui-md py-ui-xs text-xs text-error"
    >
      {{ error }}
    </p>
    <div class="flex justify-between items-center gap-ui-sm px-ui-sm pb-ui-sm">
      <div class="flex items-center gap-ui-xs">
        <UDropdownMenu :items="mentions">
          <UButton
            icon="i-lucide-at-sign"
            aria-label="Mention a member"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="busy"
          />
        </UDropdownMenu><span class="text-xs text-dimmed select-none">Ctrl / Cmd + Enter</span>
      </div>
      <div class="flex items-center gap-ui-xs">
        <UButton
          v-if="cancellable"
          label="Cancel"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="busy"
          class="text-xs text-muted"
          @click="emit('cancel')"
        />
        <UTooltip :text="submitLabel">
          <UButton
            type="submit"
            :aria-label="submitLabel"
            icon="i-lucide-arrow-up"
            size="xs"
            class="size-ui-2xl justify-center p-ui-zero rounded-sm"
            :loading="busy"
            :disabled="!body.trim()"
          />
        </UTooltip>
      </div>
    </div>
  </form>
</template>
