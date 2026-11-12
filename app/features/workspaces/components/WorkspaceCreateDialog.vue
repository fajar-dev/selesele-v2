<script setup lang="ts">
import { workspaceInputSchema } from '#shared/validation/workspace'

const props = defineProps<{ onSave: (name: string) => Promise<void> }>()
const open = defineModel<boolean>('open', { default: false })
const state = reactive({ name: '' })
const busy = ref(false)
const error = ref<string | null>(null)
watch(open, (value) => {
  if (value) {
    state.name = ''
    error.value = null
  }
})
async function submit() {
  busy.value = true
  error.value = null
  try {
    const { name } = workspaceInputSchema.parse(state)
    await props.onSave(name)
    open.value = false
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="New workspace"
    description="A shared home for your team’s pages and ideas."
    :dismissible="!busy"
  >
    <template #body>
      <UForm
        :state="state"
        :schema="workspaceInputSchema"
        class="space-y-4"
        @submit="submit"
      >
        <UAlert
          v-if="error"
          color="error"
          :description="error"
        />
        <UFormField
          label="Name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            autofocus
            maxlength="120"
            size="lg"
            placeholder="e.g. Product studio"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2 border-t border-muted pt-5">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            :disabled="busy"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Create workspace"
            color="primary"
            :loading="busy"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
