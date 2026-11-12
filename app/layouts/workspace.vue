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
        class="lg:hidden fixed bottom-5 right-5 z-40 rounded-[4px]! p-3 border border-default"
        color="primary"
        icon="i-lucide-panel-left"
        aria-label="Toggle workspace navigation"
        @click="mobileOpen = true"
      />
    </UTooltip>
    <aside class="hidden lg:block fixed inset-y-0 left-0 z-30 w-[268px] border-r border-muted app-sidebar">
      <WorkspaceSidebar :workspace-id="workspaceId" />
    </aside>
    <USlideover
      v-model:open="mobileOpen"
      side="left"
      title="Workspace navigation"
      description="Your workspace, organized."
      :ui="{ content: 'max-w-[290px] app-sidebar' }"
    >
      <template #content>
        <WorkspaceSidebar :workspace-id="workspaceId" />
      </template>
    </USlideover>
    <main class="min-w-0 flex-1 lg:ml-[268px]">
      <slot />
    </main>
  </div>
</template>
