<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type * as z from 'zod'
import type { FolderItem } from '#shared/types/workspace'
import type { PageItem } from '#shared/types/page'
import { pageInputSchema } from '#shared/validation/page'
import { pageService } from '~/services/pageService'

const props = withDefaults(defineProps<{ workspaceId: string, folders: FolderItem[], page?: PageItem, defaultFolderId?: string | null }>(), { defaultFolderId: null })
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ success: [page: PageItem] }>()
const toast = useToast()
const colorMode = useColorMode()
const isSubmitting = ref(false)
const isEditing = computed(() => !!props.page)
const theme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
const state = reactive({ title: '', description: '', icon: '📖', folderId: null as string | null })
const folderItems = computed(() => [{ label: 'Workspace root', value: 'root' }, ...props.folders.map(folder => ({ label: folder.name, value: folder.id }))])
const folderSelection = computed({ get: () => state.folderId || 'root', set: (value: string) => {
  state.folderId = value === 'root' ? null : value
} })

watch([open, () => props.page], ([isOpen]) => {
  if (!isOpen) {
    return
  }
  state.title = props.page?.title || ''
  state.description = props.page?.description || ''
  state.icon = props.page?.icon || '📖'
  state.folderId = props.page?.folderId || props.defaultFolderId
}, { immediate: true })

function selectEmoji(emoji: { i: string }): void {
  state.icon = emoji.i
}

async function submit(event: FormSubmitEvent<z.infer<typeof pageInputSchema>>): Promise<void> {
  if (isSubmitting.value) {
    return
  }
  isSubmitting.value = true

  try {
    const response = props.page
      ? await pageService.update(props.page.id, { title: event.data.title, description: event.data.description, icon: event.data.icon })
      : await pageService.create(props.workspaceId, event.data)

    open.value = false
    emit('success', response.data)
    toast.add({ title: isEditing.value ? 'Page updated' : 'Page created', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to save page', description: errorMessage(cause), color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Edit page' : 'Create page'"
    description="Set the page title, icon and description."
  >
    <template #body>
      <UForm
        :schema="pageInputSchema"
        :state="state"
        class="space-y-4"
        @submit="submit"
      >
        <div class="flex items-end gap-4">
          <UPopover>
            <UButton
              :label="state.icon"
              aria-label="Choose page icon"
              size="xl"
              variant="outline"
              color="neutral"
              class="text-3xl"
            />
            <template #content>
              <NuxtEmojiPicker
                :hide-search="false"
                :theme="theme"
                @select="selectEmoji"
              />
            </template>
          </UPopover>
          <UFormField
            label="Title"
            name="title"
            required
            class="flex-1"
          >
            <UInput
              v-model="state.title"
              class="w-full"
              maxlength="255"
              autofocus
            />
          </UFormField>
        </div>
        <UFormField
          label="Description"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="!isEditing"
          label="Folder"
          name="folderId"
        >
          <USelect
            v-model="folderSelection"
            :items="folderItems"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="isSubmitting"
            @click="open = false"
          />
          <UButton
            :label="isEditing ? 'Save changes' : 'Create page'"
            type="submit"
            color="neutral"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
