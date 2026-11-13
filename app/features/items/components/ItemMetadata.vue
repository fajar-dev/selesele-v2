<script setup lang="ts">
import type { ContentItem, ItemUpdate } from '#shared/contracts/item'
import EntityIconPicker from '~/components/ui/EntityIconPicker.vue'
import ScreenHeading from '~/components/ui/ScreenHeading.vue'
import InlineTextField from '~/components/ui/InlineTextField.vue'

defineProps<{
  item: ContentItem
  onSave: (input: ItemUpdate) => Promise<void>
  readonly?: boolean
}>()
</script>

<template>
  <ScreenHeading
    :title="item.title"
  >
    <template #icon>
      <EntityIconPicker
        :value="item.icon"
        label="Choose item icon"
        fallback="i-lucide-file"
        :readonly="readonly"
        :on-save="icon => onSave({ icon })"
      />
    </template>
    <template #title>
      <span v-if="readonly">{{ item.title }}</span>
      <InlineTextField
        v-else
        :value="item.title"
        label="Item title"
        fallback="Untitled"
        :autofocus="item.title === 'Untitled'"
        :on-save="title => onSave({ title })"
      />
    </template>
    <template #description>
      <p
        v-if="readonly"
        class="text-muted"
      >
        {{ item.description }}
      </p>
      <InlineTextField
        v-else
        :value="item.description"
        label="Item description"
        placeholder="Add a description…"
        :maxlength="2000"
        :on-save="description => onSave({ description })"
      />
    </template>
  </ScreenHeading>
</template>
