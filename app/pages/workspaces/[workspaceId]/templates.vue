<script setup lang="ts">
import WorkspaceTemplatesScreen from '~/features/library/components/WorkspaceTemplatesScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <WorkspaceTemplatesScreen :workspace-id="String(route.params.workspaceId)" />
</template>
