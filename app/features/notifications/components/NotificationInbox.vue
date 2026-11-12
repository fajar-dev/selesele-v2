<script setup lang="ts">
import { useApi } from '~/core/http/useApi'
import type { NotificationItem } from '#shared/contracts/notification'

const { notifications } = useApi()
const open = ref(false)
const onlyUnread = ref(false)
const toast = useToast()
const { data, error, status, refresh } = useLazyAsyncData('notifications', async () => (await notifications.list()).data, { server: false, default: () => [] })
const unread = computed(() => data.value.filter(item => !item.readAt).length)
const visible = computed(() => data.value.filter(item => !onlyUnread.value || !item.readAt))
const icons = { comment: 'i-lucide-message-square-plus', invitation: 'i-lucide-user-plus', mention: 'i-lucide-at-sign', reply: 'i-lucide-message-square' }
const labels = { comment: 'New comment', invitation: 'Workspace invitation', mention: 'Mention', reply: 'Comment reply' }
let events: EventSource | undefined
let fetching = false
let again = false
async function synchronize() {
  if (fetching) {
    again = true
    return
  }
  fetching = true
  try {
    do {
      again = false
      await refresh()
    } while (again)
  } finally {
    fetching = false
  }
}
onMounted(() => {
  events = new EventSource('/api/notifications/events')
  events.onmessage = () => {
    void synchronize()
  }
})
onBeforeUnmount(() => events?.close())
watch(open, (value) => {
  if (value) {
    void synchronize()
  }
})
async function read(item?: NotificationItem) {
  try {
    await notifications.read(item?.id)
    await refresh()
    if (item) {
      open.value = false
      await navigateTo(item.pageId ? `/workspaces/${item.workspaceId}/pages/${item.pageId}` : '/')
    }
  } catch (cause) {
    toast.add({ title: 'Unable to update notifications', description: errorMessage(cause), color: 'error' })
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 10 }"
    :ui="{ content: 'rounded-lg ring-1 ring-default shadow-lg' }"
  >
    <UButton
      :aria-label="`Notifications${unread ? `, ${unread} unread` : ''}`"
      color="neutral"
      variant="ghost"
      size="sm"
      class="relative"
    >
      <UIcon
        name="i-lucide-bell"
        class="size-ui-lg"
      /><span
        v-if="unread"
        class="absolute right-ui-xs top-ui-xs size-ui-xs rounded-full bg-primary ring-2 ring-default"
      />
    </UButton>
    <template #content>
      <section
        aria-label="Notifications"
        class="w-inbox"
      >
        <header class="px-ui-lg pt-ui-lg">
          <div class="flex items-center justify-between gap-ui-md">
            <h2 class="text-sm font-semibold tracking-tight">
              Inbox <span
                v-if="unread"
                class="ms-ui-xs text-xs font-normal text-muted"
              >{{ unread }}</span>
            </h2><UTooltip text="Mark all as read">
              <UButton
                aria-label="Mark all read"
                icon="i-lucide-check-check"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="!unread"
                @click="read()"
              />
            </UTooltip>
          </div><div
            class="flex gap-ui-xl mt-ui-md border-b border-muted"
            role="group"
            aria-label="Filter notifications"
          >
            <button
              v-for="tab in [{ label: 'All activity', value: false }, { label: 'Unread', value: true }]"
              :key="tab.label"
              type="button"
              :aria-pressed="onlyUnread === tab.value"
              class="pb-ui-sm text-xs border-b"
              :class="onlyUnread === tab.value ? 'border-current text-highlighted font-medium' : 'border-transparent text-muted'"
              @click="onlyUnread = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
        </header>
        <div class="max-h-popup-lg overflow-y-auto px-ui-sm py-ui-sm">
          <div
            v-if="status === 'pending' && !data.length"
            class="space-y-ui-xl p-ui-md"
          >
            <div
              v-for="row in 3"
              :key="row"
              class="flex gap-ui-md"
            >
              <USkeleton
                aria-hidden="true"
                class="size-ui-3xl"
              /><div class="flex-1 space-y-ui-sm">
                <USkeleton
                  aria-hidden="true"
                  class="h-ui-md w-full"
                /><USkeleton
                  aria-hidden="true"
                  class="h-ui-sm w-proportion-two-thirds"
                />
              </div>
            </div>
          </div>
          <UAlert
            v-else-if="error"
            title="Unable to load notifications"
            color="error"
            :actions="[{ label: 'Retry', onClick: synchronize }]"
            class="m-ui-sm"
          />
          <div
            v-else-if="!visible.length"
            class="py-ui-6xl px-ui-2xl text-center"
          >
            <UIcon
              name="i-lucide-bell"
              class="size-ui-2xl text-dimmed mb-ui-lg"
            /><p class="text-sm font-medium text-toned">
              {{ onlyUnread ? 'All caught up' : 'A quiet moment' }}
            </p><p class="text-xs text-muted leading-relaxed mt-ui-sm">
              {{ onlyUnread ? 'You’ve read all your notifications.' : 'Mentions, replies, and workspace invitations will appear here.' }}
            </p>
          </div>
          <button
            v-for="item in visible"
            :key="item.id"
            type="button"
            class="w-full text-left flex items-start gap-ui-md px-ui-sm py-ui-md rounded-sm hover:bg-accented/30"
            @click="read(item)"
          >
            <span class="size-ui-4xl shrink-0 grid place-items-center rounded-sm bg-muted/60 text-muted"><UIcon
              :name="icons[item.kind]"
              class="size-ui-lg"
            /></span><span class="min-w-ui-zero flex-1"><span class="flex justify-between gap-ui-sm text-xs text-muted mb-ui-xs"><span>{{ labels[item.kind] }}</span><time
              :datetime="item.createdAt"
              class="shrink-0"
            >{{ formatRelativeTime(item.createdAt) }}</time></span><span
              class="block text-xs leading-normal text-toned"
              :class="{ 'font-medium text-highlighted': !item.readAt }"
            >{{ item.title }}</span></span><span
              class="mt-ui-md size-ui-xs rounded-full shrink-0"
              :class="item.readAt ? 'bg-transparent' : 'bg-primary'"
            />
          </button>
        </div>
      </section>
    </template>
  </UPopover>
</template>
