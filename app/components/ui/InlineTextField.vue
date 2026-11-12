<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string
  label: string
  fallback?: string
  onSave: (value: string) => Promise<void>
  maxlength?: number
  autofocus?: boolean
  forceSave?: boolean
  placeholder?: string
}>(), { maxlength: 255, autofocus: false, forceSave: false, placeholder: '', fallback: '' })
const emit = defineEmits<{ done: [], cancel: [] }>()
const draft = ref(props.value)
const busy = ref(false)
const error = ref('')
const input = useTemplateRef('input')
let cancelled = false
let completed = false
watch(() => props.value, (value, previous) => {
  if (draft.value === previous) {
    draft.value = value
  }
})
function focus(select = true) {
  const element = input.value?.textareaRef
  element?.focus()
  if (select) {
    element?.select()
  }
}
onMounted(async () => {
  if (props.autofocus) {
    await nextTick()
    focus()
  }
})
async function save() {
  if (busy.value || cancelled || completed) {
    return
  }
  const value = draft.value.trim() || props.fallback
  if (!props.forceSave && value === props.value) {
    draft.value = value
    emit('done')
    return
  }
  busy.value = true
  error.value = ''
  try {
    await props.onSave(value)
    draft.value = value
    completed = props.forceSave
    emit('done')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || busy.value) {
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void save()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelled = true
    draft.value = props.value
    error.value = ''
    input.value?.textareaRef?.blur()
    emit('cancel')
  }
}
defineExpose({ focus })
</script>

<template>
  <span class="block min-w-0 w-full">
    <UTextarea
      ref="input"
      v-model="draft"
      as="span"
      variant="none"
      :rows="1"
      autoresize
      :maxlength="maxlength"
      :aria-label="label"
      :aria-invalid="!!error || undefined"
      :readonly="busy"
      :placeholder="placeholder"
      style="font: inherit; letter-spacing: inherit"
      class="w-full"
      :ui="{ base: 'w-full text-inherit resize-none rounded-none p-0 bg-transparent ring-0 shadow-none focus-visible:ring-0 focus-visible:shadow-[0_1px_0_var(--ui-border-accented)]', root: 'w-full' }"
      @focus="cancelled = false"
      @blur="save"
      @keydown="keydown"
    />
    <span
      v-if="busy"
      role="status"
      class="sr-only"
    >Saving {{ label }}</span>
    <span
      v-if="error"
      role="alert"
      class="block mt-1 text-xs leading-5 font-normal text-muted"
    >
      {{ error }}
      <UButton
        label="Retry"
        size="xs"
        color="neutral"
        variant="link"
        class="ml-1 p-0"
        @mousedown.prevent
        @click="save"
      />
    </span>
  </span>
</template>
