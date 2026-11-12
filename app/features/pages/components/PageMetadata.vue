<script setup lang="ts">
import type { PageItem, PageUpdate } from '#shared/contracts/page'
import PageHeading from '~/components/ui/PageHeading.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'

const props = defineProps<{ page: PageItem, workspaceName: string, memberCount: number, onSave: (input: PageUpdate) => Promise<void> }>()
const iconOpen = ref(false)
const iconSaving = ref(false)
const colorMode = useColorMode()
const toast = useToast()
async function selectIcon(emoji: { i: string }) {
  if (iconSaving.value) {
    return
  }
  iconSaving.value = true
  try {
    await props.onSave({ icon: emoji.i })
    iconOpen.value = false
  } catch (cause) {
    toast.add({ title: 'Unable to update page icon', description: errorMessage(cause), color: 'error' })
  } finally {
    iconSaving.value = false
  }
}
</script>

<template>
  <PageHeading
    :title="page.title"
  >
    <template #icon>
      <UPopover
        v-model:open="iconOpen"
        :content="{ align: 'start' }"
      >
        <UButton
          :label="iconSaving ? undefined : page.icon || '📄'"
          aria-label="Choose page icon"
          color="neutral"
          variant="ghost"
          :loading="iconSaving"
          class="size-10 p-0 justify-center text-[2rem] leading-none"
        />
        <template #content>
          <NuxtEmojiPicker
            :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
            @select="selectIcon"
          />
        </template>
      </UPopover>
    </template>
    <template #title>
      <InlineTextField
        :value="page.title"
        label="Page title"
        fallback="Untitled"
        :autofocus="page.title === 'Untitled'"
        :on-save="title => onSave({ title })"
      />
    </template>
    <template #metadata>
      <UIcon
        name="i-lucide-users"
        class="size-3.5"
      />
      <span>Shared with {{ workspaceName }}</span>
      <span class="text-dimmed">·</span>
      <span>{{ memberCount }} {{ memberCount === 1 ? 'member' : 'members' }}</span>
    </template>
  </PageHeading>
</template>
