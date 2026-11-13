<script setup lang="ts">
import WorkspaceSidebar from '~/features/workspaces/components/WorkspaceSidebar.vue'

const route = useRoute()
const workspaceId = computed(() => String(route.params.workspaceId || ''))
const mobileOpen = ref(false)
watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
</script>

<template>
  <div class="flex min-h-screen bg-default">
    <UTooltip text="Workspace navigation">
      <UButton
        class="lg:hidden fixed bottom-ui-xl right-ui-xl z-40 rounded-sm! p-ui-md border border-default"
        color="primary"
        icon="i-lucide-panel-left"
        aria-label="Toggle workspace navigation"
        @click="mobileOpen = true"
      />
    </UTooltip>
    <aside class="hidden lg:block fixed inset-y-ui-zero left-ui-zero z-30 w-sidebar border-r border-muted app-sidebar">
      <WorkspaceSidebar :workspace-id="workspaceId" />
    </aside>
    <USlideover
      v-model:open="mobileOpen"
      side="left"
      title="Workspace navigation"
      description="Your workspace, organized."
      :ui="{ content: 'max-w-sidebar-mobile app-sidebar' }"
    >
      <template #content>
        <WorkspaceSidebar :workspace-id="workspaceId" />
      </template>
    </USlideover>
    <main class="min-w-ui-zero flex-1 lg:ml-sidebar">
      <slot />
    </main>
  </div>
</template>
