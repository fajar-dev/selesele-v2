<script setup lang="ts">
import ScreenSection from '~/components/ui/ScreenSection.vue'
import type { WorkspaceNotificationPreferences } from '#shared/contracts/workspaceSettings'

defineProps<{
  busy: boolean
  onSave: () => Promise<void>
}>()
const model = defineModel<WorkspaceNotificationPreferences>({ required: true })
const channels = [
  { key: 'comment' as const, title: 'New comments', description: 'When someone comments on an item you are involved in.' },
  { key: 'reply' as const, title: 'Replies', description: 'Updates to discussions you are part of.' },
  { key: 'mention' as const, title: 'Mentions', description: 'When a teammate mentions you in an item or comment.' },
  { key: 'invitation' as const, title: 'Workspace access', description: 'Applies to workspace access notifications across your account. Always delivered immediately.' }
]
</script>

<template>
  <ScreenSection
    title="Your email notifications"
    description="These preferences are personal. In-app notifications stay enabled."
  >
    <div
      v-for="channel in channels"
      :key="channel.key"
      class="flex items-start justify-between gap-ui-xl border-b border-muted pb-ui-xl"
    >
      <div>
        <h3 class="text-sm font-medium">
          {{ channel.title }}
        </h3><p class="mt-ui-xs text-sm text-muted leading-relaxed">
          {{ channel.description }}
        </p>
      </div>
      <USwitch
        v-model="model.email[channel.key]"
        :aria-label="channel.title"
      />
    </div>
    <UFormField
      label="Email delivery"
      description="Daily summaries collect workspace updates and send at 08:00 WIB (Asia/Jakarta)."
    >
      <USelect
        v-model="model.delivery"
        :items="[{ label: 'Immediately', value: 'immediate' }, { label: 'Daily summary', value: 'daily' }]"
        class="w-full sm:w-ui-16xl"
      />
    </UFormField>
    <UButton
      label="Save preferences"
      :loading="busy"
      @click="onSave"
    />
  </ScreenSection>
</template>
