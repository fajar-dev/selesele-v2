<script setup lang="ts">
import type { FolderItem } from '#shared/types/workspace'
import type { PageItem } from '#shared/types/page'
import { pageService } from '~/services/pageService'

const props = defineProps<{ page: PageItem, folders: FolderItem[] }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ moved: [page: PageItem] }>()
const selected = ref('root')
const busy = ref(false)
const error = ref<string | null>(null)
const items = computed(() => [{ label: 'Workspace root', value: 'root' }, ...props.folders.map(folder => ({ label: folder.name, value: folder.id }))])
watch(open, (value) => {
  if (value) {
    selected.value = props.page.folderId || 'root'
    error.value = null
  }
})
async function move() {
  busy.value = true
  error.value = null
  try {
    const response = await pageService.move(props.page.id, selected.value === 'root' ? null : selected.value)
    emit('moved', response.data)
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
    title="Move page"
    description="Choose a folder in this workspace. Workspace members keep their access."
    :dismissible="!busy"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="move"
      >
        <UAlert
          v-if="error"
          color="error"
          :description="error"
        />
        <UFormField label="Destination">
          <USelect
            v-model="selected"
            :items="items"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            variant="ghost"
            color="neutral"
            :disabled="busy"
            @click="open = false"
          /><UButton
            type="submit"
            label="Move page"
            icon="i-lucide-folder-input"
            color="neutral"
            :loading="busy"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
