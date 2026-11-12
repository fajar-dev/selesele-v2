<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

const fileUploadRef = useTemplateRef('fileUploadRef')

const error = ref<string | null>(null)
const loading = ref(false)

async function onFileChange() {
  const target = fileUploadRef.value?.inputRef
  if (!target) {
    return
  }

  loading.value = true
  error.value = null

  try {
    const file = target.files?.[0]
    if (!file) {
      return
    }
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ url: string }>('/api/upload', { method: 'POST', body })

    const pos = props.getPos()
    if (typeof pos !== 'number') {
      return
    }

    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .setImage({ src: result.url })
      .run()
  } catch (e) {
    error.value = (e as Error & { data?: { message?: string } }).data?.message || 'An unknown error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NodeViewWrapper>
    <UFileUpload
      ref="fileUploadRef"
      accept="image/*"
      label="Upload an image"
      :description="error || 'PNG, JPG, WebP or GIF (max. 2MB)'"
      :preview="false"
      class="min-h-48 rounded-[6px] bg-muted/50"
      :ui="{ description: error ? 'text-error' : '' }"
      @update:model-value="onFileChange"
    >
      <template #leading>
        <UAvatar
          :icon="error ? 'i-lucide-alert-circle' : loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin', error && 'text-error'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>
