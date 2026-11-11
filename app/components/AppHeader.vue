<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{ toolbar?: boolean }>(), { toolbar: false })
const route = useRoute()
const insideWorkspace = computed(() => !!route.params.workspaceId)
const { state: authState, service: authService } = useAuth()
const toast = useToast()
const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: authState.user?.name || 'Your account', description: authState.user?.email || '', type: 'label' }],
  [{ label: 'All workspaces', icon: 'i-lucide-panels-top-left', to: '/' }, { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: logout }]
])
async function logout(): Promise<void> {
  try {
    await authService.logout()
    toast.add({ title: 'Signed out', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'Unable to sign out', description: errorMessage(cause), color: 'error' })
  }
}
</script>

<template>
  <UHeader class="z-10 bg-default/95 backdrop-blur-sm [--ui-header-height:3.5rem]" :toggle="false" :ui="{ container: 'px-4 sm:px-7! gap-3', left: 'min-w-0 gap-3', right: 'shrink-0 gap-3' }">
    <template #left>
      <slot v-if="toolbar" name="toolbar-left" />
      <template v-else>
        <NuxtLink v-if="!insideWorkspace" to="/" class="flex items-center gap-2.5 font-semibold tracking-tight text-highlighted" aria-label="SeleSele home">
          <img class="size-8 object-contain" src="/logo.png" alt="" >
          <span>SeleSele<span class="text-primary">.</span></span>
        </NuxtLink>
        <slot name="left" />
      </template>
    </template>
    <template #right>
      <slot name="right" />
      <template v-if="!insideWorkspace">
        <UColorModeButton size="sm" color="neutral" variant="ghost" />
        <ClientOnly>
          <UDropdownMenu :items="items" :content="{ align: 'end' }" :ui="{ content: 'w-64' }">
            <UButton color="neutral" variant="ghost" aria-label="Account menu" class="p-1">
              <UAvatar :alt="authState.user?.name || 'Your account'" :src="authState.user?.avatar || undefined" size="sm" class="bg-primary/10 text-primary ring-1 ring-primary/10" />
            </UButton>
          </UDropdownMenu>
        </ClientOnly>
      </template>
    </template>
  </UHeader>
  <UDashboardToolbar v-if="toolbar" class="bg-muted/35 min-h-11" :ui="{ container: 'px-3 sm:px-7 gap-2', left: 'min-w-0 w-full overflow-x-auto py-1.5', right: 'hidden' }">
    <template #left><slot name="toolbar-right" /></template>
  </UDashboardToolbar>
</template>
