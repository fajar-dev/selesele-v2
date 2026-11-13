<script setup lang="ts">
const { onRetry, feedbackKeys = [] } = defineProps<{ onRetry: () => unknown | Promise<unknown>, feedbackKeys?: string[] }>()
const busy = ref(false)
const toast = useToast()
const announced = useState<Record<string, string>>('feedback-announcements', () => ({}))
async function retry() {
  if (busy.value) {
    return
  }
  busy.value = true
  for (const key of feedbackKeys) {
    Reflect.deleteProperty(announced.value, key)
  }
  try {
    await onRetry()
  } catch (cause) {
    toast.add({ title: 'Unable to retry', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="py-ui-lg">
    <UButton
      label="Try again"
      icon="i-lucide-rotate-cw"
      color="neutral"
      variant="outline"
      size="sm"
      :loading="busy"
      @click="retry"
    />
  </div>
</template>
