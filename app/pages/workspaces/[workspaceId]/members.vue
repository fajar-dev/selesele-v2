<script setup lang="ts">
import WorkspaceMembersScreen from '~/features/members/components/WorkspaceMembersScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <WorkspaceMembersScreen :workspace-id="String(route.params.workspaceId)" />
</template>
