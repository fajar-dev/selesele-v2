<script setup lang="ts">
import { usePersonalLibrary } from '../composables/usePersonalLibrary'

const props = defineProps<{ workspaceId: string }>()
const { data } = usePersonalLibrary()
const expanded = ref(false)
const favorites = computed(() => data.value.favorites.filter(item => item.workspaceId === props.workspaceId))
const visible = computed(() => expanded.value ? favorites.value : favorites.value.slice(0, 5))
watch(() => props.workspaceId, () => {
  expanded.value = false
})
</script>

<template>
  <section
    v-if="favorites.length"
    aria-label="Favorites"
  >
    <h2 class="sidebar-section-label px-ui-sm mb-ui-xs">
      Favorites
    </h2>
    <NuxtLink
      v-for="item in visible"
      :key="item.id"
      :to="libraryPath(item)"
      class="flex items-center gap-ui-sm px-ui-sm py-ui-xs rounded-sm hover:bg-(--app-hover) min-w-ui-zero text-xs text-toned"
    >
      <span class="shrink-0">{{ item.icon || '📄' }}</span>
      <span
        class="truncate"
        :title="item.title"
      >{{ item.title }}</span>
    </NuxtLink>
    <UButton
      v-if="favorites.length > 5"
      :label="expanded ? 'Show less' : `Show ${favorites.length - 5} more`"
      color="neutral"
      variant="ghost"
      size="xs"
      class="text-muted ms-ui-xs mt-ui-xs"
      @click="expanded = !expanded"
    />
  </section>
</template>
