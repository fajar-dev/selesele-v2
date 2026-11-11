<script setup lang="ts">
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
      <button
        class="lg:hidden fixed bottom-5 right-5 z-40 rounded-full border border-default bg-elevated p-3 shadow-lg"
        aria-label="Toggle workspace navigation"
        @click="mobileOpen = !mobileOpen"
      >
        <UIcon
          :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-panel-left'"
          class="size-5"
        />
      </button>
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-20 bg-black/30 lg:hidden"
        @click="mobileOpen = false"
      />
      <aside :class="[mobileOpen ? 'flex' : 'hidden', 'lg:flex fixed inset-y-0 left-0 z-30 w-64 border-r border-default bg-muted flex-col']">
        <WorkspacesSidebar :overview="data" />
      </aside>
      <main class="min-w-0 flex-1 lg:ml-64">
        <slot />
      </main>
    </div>
    <main
      v-else
      class="p-8 max-w-2xl mx-auto space-y-4"
    >
      <UAlert
        title="Unable to open workspace"
        :description="error ? errorMessage(error) : 'Workspace not found'"
        color="error"
      />
      <UButton
        label="All workspaces"
        to="/"
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
