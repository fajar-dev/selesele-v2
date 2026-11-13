<script setup lang="ts">
import ArchivedItemsScreen from '~/features/items/components/ArchivedItemsScreen.vue'

definePageMeta({ layout: 'workspace' })
const route = useRoute()
</script>

<template>
  <ArchivedItemsScreen :workspace-id="String(route.params.workspaceId)" />
</template>
