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
      content: 'w-floating max-w-popup-lg divide-y-0 rounded-lg ring-1 ring-default shadow-xl',
      header: 'p-ui-2xl sm:p-ui-2xl pb-ui-zero sm:pb-ui-zero border-b-0',
      title: 'text-base font-semibold tracking-tight text-highlighted',
      description: 'mt-ui-md text-sm leading-relaxed text-muted break-words',
      body: 'px-ui-2xl sm:px-ui-2xl pt-ui-lg sm:pt-ui-lg pb-ui-zero sm:pb-ui-zero',
      footer: 'flex justify-end gap-ui-sm p-ui-2xl sm:p-ui-2xl pt-ui-xl sm:pt-ui-xl border-t-0'
    }"
  >
    <template #title>
      <span class="flex items-center gap-ui-md">
        <span
          class="inline-flex size-ui-4xl shrink-0 items-center justify-center rounded-md bg-error/8 text-error ring-1 ring-inset ring-error/15"
          aria-hidden="true"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="size-ui-lg"
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
        class="min-w-ui-9xl justify-center px-ui-lg"
        :disabled="isSubmitting"
        @click="open = false"
      />
      <UButton
        :label="confirmLabel"
        color="error"
        variant="solid"
        class="min-w-ui-9xl justify-center px-ui-lg"
        :loading="isSubmitting"
        :disabled="isSubmitting"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
