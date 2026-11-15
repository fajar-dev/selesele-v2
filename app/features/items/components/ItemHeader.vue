<script setup lang="ts">
import AppHeader from '~/components/shell/AppHeader.vue'
import Breadcrumbs from '~/components/ui/Breadcrumbs.vue'
import FavoriteButton from '~/features/library/components/FavoriteButton.vue'
import { usePersonalLibrary } from '~/features/library/composables/usePersonalLibrary'
import { useApi } from '~/core/http/useApi'
import type { ContentItem } from '#shared/model/item'
import type { FolderItem } from '#shared/model/workspace'
import { DEFAULT_FOLDER_ICON } from '#shared/model/icons'

const { item, workspaceName, workspaceIcon, folders = [] } = defineProps<{
  item: ContentItem
  workspaceName: string
  workspaceIcon?: string
  folders?: FolderItem[]
}>()
const personal = usePersonalLibrary(), library = useApi().library
const favorite = computed(() => personal.data.value.favorites.some(entry => entry.id === item.id))
const breadcrumbs = computed(() => [
  { label: workspaceName, emoji: workspaceIcon, to: `/workspaces/${item.workspaceId}` },
  ...(item.folderId ? [{ label: folders.find(folder => folder.id === item.folderId)?.name || 'Folder', emoji: folders.find(folder => folder.id === item.folderId)?.icon || DEFAULT_FOLDER_ICON, to: `/workspaces/${item.workspaceId}?folder=${item.folderId}` }] : []),
  { label: item.title, emoji: item.icon }
])
onMounted(() => {
  void library.visit(item.id).catch(() => {})
})
</script>

<template>
  <AppHeader>
    <template #left>
      <Breadcrumbs :items="breadcrumbs" />
    </template>
    <template #right>
      <FavoriteButton
        :favorite="favorite"
        :loading="personal.busy.value"
        @click="personal.favorite(item.id)"
      />
      <slot />
    </template>
  </AppHeader>
</template>
