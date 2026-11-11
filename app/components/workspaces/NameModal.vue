<script setup lang="ts">
import { folderInputSchema } from '#shared/validation/workspace'

const props = withDefaults(defineProps<{ title: string, description: string, initialName?: string, onSave: (name: string) => Promise<void> }>(), { initialName: '' })
const open = defineModel<boolean>('open', { default: false })
const state = reactive({ name: '' })
const busy = ref(false)
const error = ref<string | null>(null)
watch(open, (value) => {
  if (value) {
    state.name = props.initialName
    error.value = null
  }
})
async function submit() {
  busy.value = true
  error.value = null
  try {
    const { name } = folderInputSchema.parse(state)
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
    :title="title"
    :description="description"
    :dismissible="!busy"
  >
    <template #body>
      <UForm
        :state="state"
        :schema="folderInputSchema"
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
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            :disabled="busy"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save"
            color="neutral"
            :loading="busy"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
