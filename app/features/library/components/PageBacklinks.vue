<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import DataRetry from '~/components/ui/DataRetry.vue'
import { useApi } from '~/core/http/useApi'

const props = defineProps<{ pageId: string }>()
const { library } = useApi()
const open = ref(false)
const { data, error, status, refresh } = useLazyAsyncData(`backlinks:${props.pageId}`, async () => (await library.backlinks(props.pageId)).data, { server: false, immediate: false, default: () => [] })
watch(open, (value) => {
  if (value) {
    void refresh()
  }
})

useFeedbackToast(error, { key: `backlinks:${props.pageId}`, title: 'Unable to load backlinks', recovered: () => status.value === 'success', retry: () => refresh() })
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      label="Backlinks"
      icon="i-lucide-link"
      size="sm"
      color="neutral"
      variant="ghost"
    />
    <template #content>
      <div class="p-ui-md w-ui-17xl max-h-ui-18xl overflow-y-auto">
        <p class="text-xs text-muted mb-ui-sm">
          Pages linking to this document
        </p>
        <p
          v-if="status === 'pending'"
          role="status"
          class="text-sm text-muted"
        >
          Loading…
        </p>
        <DataRetry
          v-else-if="error"
          :feedback-keys="[`backlinks:${props.pageId}`]"
          :on-retry="() => refresh()"
        />
        <p
          v-else-if="!data.length"
          class="text-sm text-muted"
        >
          No linked pages yet.
        </p>
        <NuxtLink
          v-for="item in data"
          :key="item.id"
          :to="libraryPath(item)"
          class="block text-sm py-ui-sm truncate hover:underline"
          @click="open = false"
        >{{ item.icon || '📄' }} {{ item.title }}</NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
