<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}>(), {
  confirmLabel: 'Delete'
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
    :close="false"
    :dismissible="!isSubmitting"
    :ui="{
      overlay: 'bg-black/35 dark:bg-black/60',
      content: 'w-[calc(100vw-2rem)] max-w-[420px] divide-y-0 rounded-[8px] ring-1 ring-default shadow-xl',
      header: 'p-6 sm:p-6 pb-0 sm:pb-0 border-b-0',
      title: 'text-base font-semibold tracking-tight text-highlighted',
      description: 'mt-3 text-sm leading-6 text-muted break-words',
      body: 'px-6 sm:px-6 pt-4 sm:pt-4 pb-0 sm:pb-0',
      footer: 'flex justify-end gap-2 p-6 sm:p-6 pt-5 sm:pt-5 border-t-0'
    }"
  >
    <template #title>
      <span class="flex items-center gap-3">
        <span
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-error/8 text-error ring-1 ring-inset ring-error/15"
          aria-hidden="true"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="size-4.5"
          />
        </span>
        <span>{{ title }}</span>
      </span>
    </template>
    <template
      v-if="error"
      #body
    >
      <UAlert
        title="Unable to delete"
        :description="error"
        icon="i-lucide-circle-alert"
        color="error"
        variant="soft"
      />
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        class="min-w-20 justify-center px-4"
        :disabled="isSubmitting"
        @click="open = false"
      />
      <UButton
        :label="confirmLabel"
        color="error"
        variant="solid"
        class="min-w-20 justify-center px-4"
        :loading="isSubmitting"
        :disabled="isSubmitting"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
