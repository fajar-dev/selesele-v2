<script setup lang="ts">
import { useApi } from '~/core/http/useApi'
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'

const { media } = useApi()
const props = defineProps<NodeViewProps>()
const fileUploadRef = useTemplateRef('fileUploadRef')
const toast = useToast()
const loading = ref(false)
async function onFileChange() {
  const target = fileUploadRef.value?.inputRef
  if (!target) {
    return
  }
  loading.value = true
  try {
    const file = target.files?.[0]
    if (!file) {
      return
    }
    const result = await media.upload(file, props.extension.options.itemId)
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
    toast.add({ title: 'Unable to upload image', description: errorMessage(e), color: 'error' })
  } finally {
    loading.value = false
    target.value = ''
  }
}
</script>

<template>
  <NodeViewWrapper>
    <UFileUpload
      v-if="editor.isEditable"
      ref="fileUploadRef"
      accept="image/*"
      label="Upload an image"
      description="PNG, JPG, WebP or GIF (max. 2MB)"
      :preview="false"
      class="min-h-ui-14xl rounded-md bg-muted/50"
      @update:model-value="onFileChange"
    >
      <template #leading>
        <UAvatar
          :icon="loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>
