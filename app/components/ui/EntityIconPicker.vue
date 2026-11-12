<script setup lang="ts">
import EntityIcon from './EntityIcon.vue'

const props = defineProps<{
  value?: string | null
  label: string
  fallback?: string
  readonly?: boolean
  onSave: (icon: string) => Promise<void>
}>()
const open = ref(false)
const saving = ref(false)
const colorMode = useColorMode()
const toast = useToast()
async function select(emoji: { i: string }) {
  if (saving.value || props.readonly) {
    return
  }
  saving.value = true
  try {
    await props.onSave(emoji.i)
    open.value = false
  } catch (cause) {
    toast.add({ title: 'Unable to update icon', description: errorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <EntityIcon
    v-if="readonly"
    :value="value"
    :fallback="fallback"
    class="size-10 text-[2rem]"
  />
  <UPopover
    v-else
    v-model:open="open"
    :content="{ align: 'start' }"
  >
    <UButton
      :aria-label="label"
      color="neutral"
      variant="ghost"
      :loading="saving"
      :disabled="saving"
      class="size-10 p-0 justify-center text-[2rem] leading-none"
    >
      <EntityIcon
        v-if="!saving"
        :value="value"
        :fallback="fallback"
        class="size-8"
      />
    </UButton>
    <template #content>
      <NuxtEmojiPicker
        :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
        @select="select"
      />
    </template>
  </UPopover>
</template>
