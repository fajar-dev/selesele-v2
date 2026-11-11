<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}>(), {
  title: 'Confirm action',
  description: 'Are you sure you want to continue?',
  confirmLabel: 'Confirm'
})

const open = defineModel<boolean>('open', { default: false })
const isSubmitting = ref(false)
const error = ref<string | null>(null)

watch(open, () => {
  error.value = null
})

async function confirm(): Promise<void> {
  if (isSubmitting.value) {
    return
  }
  isSubmitting.value = true
  error.value = null

  try {
    await props.onConfirm()
    open.value = false
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!isSubmitting"
  >
    <template #body>
      <UAlert
        v-if="error"
        title="Unable to complete action"
        :description="error"
        color="error"
      />
      <div class="mt-4 flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="isSubmitting"
          @click="open = false"
        />
        <UButton
          :label="confirmLabel"
          color="error"
          :loading="isSubmitting"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
