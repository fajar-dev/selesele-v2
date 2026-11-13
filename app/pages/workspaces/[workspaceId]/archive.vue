<script setup lang="ts">
import ArchivedPagesScreen from '~/features/pages/components/ArchivedPagesScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <ArchivedPagesScreen :workspace-id="String(route.params.workspaceId)" />
</template>
