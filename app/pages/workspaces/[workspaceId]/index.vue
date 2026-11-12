<script setup lang="ts">
import WorkspaceOverviewScreen from '~/features/workspaces/components/WorkspaceOverviewScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <WorkspaceOverviewScreen :workspace-id="String(route.params.workspaceId)" />
</template>
