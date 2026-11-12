<script setup lang="ts">
import WorkspaceSidebar from '~/features/workspaces/components/WorkspaceSidebar.vue'
import { useWorkspace } from '~/features/workspaces/composables/useWorkspace'

const route = useRoute()
const workspaceId = computed(() => String(route.params.workspaceId || ''))
const { data, error, refresh } = await useWorkspace(workspaceId.value)
const mobileOpen = ref(false)
watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-default">
    <div
      v-if="data"
      class="flex min-h-screen"
    >
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
        <WorkspaceSidebar :overview="data" />
      </aside>
      <USlideover
        v-model:open="mobileOpen"
        side="left"
        :title="data.workspace.name"
        description="Your workspace, organized."
        :ui="{ content: 'max-w-[290px] app-sidebar', body: 'p-0 sm:p-0 min-h-0 flex flex-col', header: 'min-h-0 py-4 px-5' }"
      >
        <template #body>
          <WorkspaceSidebar :overview="data" />
        </template>
      </USlideover>
      <main class="min-w-0 flex-1 lg:ml-[268px]">
        <slot />
      </main>
    </div>
    <main
      v-else
      class="p-6 sm:p-10 max-w-2xl mx-auto space-y-4"
    >
      <UAlert
        title="Unable to open workspace"
        :description="error ? errorMessage(error) : 'Workspace not found'"
        color="error"
      />
      <UButton
        label="All workspaces"
        to="/"
        icon="i-lucide-arrow-left"
        color="neutral"
      />
      <UButton
        label="Retry"
        variant="soft"
        color="neutral"
        @click="refresh()"
      />
    </main>
  </div>
</template>
