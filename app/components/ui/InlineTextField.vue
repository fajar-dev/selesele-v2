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
const toast = useToast()
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
    toast.add({ title: `Unable to save ${props.label.toLowerCase()}`, description: error.value, color: 'error' })
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
  <span class="block min-w-ui-zero w-full">
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

      class="inherit-typography w-full"
      :ui="{ base: 'inherit-typography w-full text-inherit resize-none rounded-none p-ui-zero bg-transparent ring-0 shadow-none focus-visible:ring-0 focus-visible:shadow-inline', root: 'w-full' }"
      @focus="cancelled = false"
      @blur="save"
      @keydown="keydown"
    />
    <span
      v-if="busy"
      role="status"
      class="sr-only"
    >Saving {{ label }}</span>
    <UButton
      v-if="error"
      label="Retry save"
      size="xs"
      color="neutral"
      variant="link"
      @mousedown.prevent
      @click="save"
    />
  </span>
</template>
