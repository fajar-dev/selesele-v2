<script setup lang="ts">
import WorkspaceSettingsScreen from '~/features/settings/components/WorkspaceSettingsScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <WorkspaceSettingsScreen :workspace-id="String(route.params.workspaceId)" />
</template>
