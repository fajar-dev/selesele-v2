<script setup lang="ts">
import WorkspaceQuestionsScreen from '~/features/library/components/WorkspaceQuestionsScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <WorkspaceQuestionsScreen
    :key="String(route.params.workspaceId)"
    :workspace-id="String(route.params.workspaceId)"
  />
</template>
