<script setup lang="ts">
import type { PageItem, PageUpdate } from '#shared/contracts/page'
import EntityIconPicker from '~/components/ui/EntityIconPicker.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'

defineProps<{ page: PageItem, onSave: (input: PageUpdate) => Promise<void> }>()
</script>

<template>
  <PageHeading
    :title="page.title"
  >
    <template #icon>
      <EntityIconPicker
        :value="page.icon"
        label="Choose page icon"
        fallback="i-lucide-file"
        :on-save="icon => onSave({ icon })"
      />
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
    <template #description>
      <InlineTextField
        :value="page.description"
        label="Page description"
        placeholder="Add a description…"
        :maxlength="2000"
        :on-save="description => onSave({ description })"
      />
    </template>
  </PageHeading>
</template>
