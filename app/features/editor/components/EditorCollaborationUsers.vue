<script setup lang="ts">
import type { CollaborationUser } from '~/features/editor/composables/useEditorCollaboration'

defineProps<{ users: CollaborationUser[] }>()
</script>

<template>
  <UAvatarGroup
    :max="3"
    class="shrink-0"
  >
    <UTooltip
      v-for="user in users"
      :key="user.clientId ?? user.name"
      :text="user.name"
    >
      <UAvatar
        :alt="user.name"
        :src="user.avatar"
        size="xs"
        class="bg-muted text-toned ring-1 ring-default"
      />
    </UTooltip>
  </UAvatarGroup>
</template>
