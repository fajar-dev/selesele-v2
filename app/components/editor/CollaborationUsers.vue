<script setup lang="ts">
import type { CollaborationUser } from '~/composables/useEditorCollaboration'

defineProps<{ users: CollaborationUser[] }>()
</script>

<template>
  <UAvatarGroup :max="5">
    <UTooltip
      v-for="user in users"
      :key="user.clientId ?? user.name"
      :text="user.name"
    >
      <UAvatar
        :alt="user.name"
        :src="user.avatar"
        size="xs"
        :style="{ color: user.color }"
      />
    </UTooltip>
  </UAvatarGroup>
</template>
