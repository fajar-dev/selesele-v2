<script setup lang="ts">
import NotificationInbox from '~/features/notifications/components/NotificationInbox.vue'
import { useLibrarySearch } from '~/features/library/composables/useLibrarySearch'
import AppBrand from './AppBrand.vue'
import { useAuth } from '~/features/auth/composables/useAuth'
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const searchOpen = useLibrarySearch()
const navigation = [{ label: 'Workspaces', to: '/', icon: 'i-lucide-panels-top-left' }, { label: 'My tasks', to: '/tasks', icon: 'i-lucide-list-checks' }, { label: 'Trash', to: '/trash', icon: 'i-lucide-trash-2' }]
const insideWorkspace = computed(() => !!route.params.workspaceId)
const { state: authState, service: authService } = useAuth()
const toast = useToast()
const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', slot: 'account' }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: logout }]
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
  <UHeader
    class="z-10 bg-default border-muted"
    :class="insideWorkspace ? 'header-workspace' : 'header-directory'"
    :toggle="false"
    :ui="{
      container: insideWorkspace ? 'max-w-none w-full px-ui-lg sm:px-ui-2xl lg:px-ui-2xl gap-ui-lg' : 'max-w-none w-full px-ui-lg sm:px-ui-2xl lg:px-ui-4xl gap-ui-md sm:gap-ui-2xl',
      left: 'min-w-ui-zero flex-1 gap-ui-md',
      right: 'shrink-0 flex-none lg:flex-none gap-ui-xs sm:gap-ui-sm'
    }"
  >
    <template #left>
      <NuxtLink
        v-if="!insideWorkspace"
        to="/"
        class="inline-flex shrink-0 items-center gap-ui-sm rounded-sm text-sm font-semibold tracking-tight text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="SeleSele home"
      >
        <AppBrand class="[&>span]:hidden sm:[&>span]:inline" />
      </NuxtLink>
      <nav
        v-if="!insideWorkspace"
        aria-label="Main navigation"
        class="hidden sm:flex items-center gap-ui-xs ms-ui-2xl"
      >
        <UButton
          v-for="item in navigation"
          :key="item.to"
          :label="item.label"
          :to="item.to"
          :aria-current="route.path === item.to ? 'page' : undefined"
          color="neutral"
          variant="ghost"
          class="px-ui-md text-xs"
          :class="route.path === item.to ? 'text-highlighted bg-muted font-semibold' : 'text-muted'"
        />
      </nav>
      <UDropdownMenu
        v-if="!insideWorkspace"
        :items="navigation"
      >
        <UButton
          :icon="route.path === '/trash' ? 'i-lucide-trash-2' : 'i-lucide-panels-top-left'"
          aria-label="Main navigation"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          class="sm:hidden px-ui-xs text-xs"
          :ui="{ trailingIcon: 'size-ui-md' }"
        >
          <span class="hidden sm:inline">{{ route.path === '/trash' ? 'Trash' : 'Workspaces' }}</span>
        </UButton>
      </UDropdownMenu>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
      <UButton
        v-if="!insideWorkspace"
        aria-label="Search all content"
        icon="i-lucide-search"
        color="neutral"
        variant="ghost"
        class="sm:bg-muted sm:border sm:border-muted sm:min-w-ui-13xl sm:justify-start sm:me-ui-md text-muted"
        size="sm"
        @click="searchOpen = true"
      >
        <span class="hidden sm:inline text-xs">Search items…</span>
        <template #trailing>
          <span class="hidden sm:inline ms-auto text-xs text-dimmed">⌘ K</span>
        </template>
      </UButton>
      <NotificationInbox />
      <template v-if="!insideWorkspace">
        <UColorModeButton
          size="sm"
          color="neutral"
          variant="ghost"
        />
        <ClientOnly>
          <UDropdownMenu
            :items="items"
            :content="{ align: 'end', sideOffset: 8, collisionPadding: 12 }"
            :ui="{
              content: 'w-ui-15xl',
              viewport: 'divide-muted',
              label: 'px-ui-sm py-ui-sm font-normal',
              item: 'px-ui-sm py-ui-sm text-xs font-normal',
              itemLeadingIcon: 'size-ui-lg',
              itemTrailingIcon: 'size-ui-md'
            }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              aria-label="Account menu"
              class="p-ui-xs ms-ui-xs hover:bg-accented/40 rounded-full"
              :ui="{ trailingIcon: 'size-ui-md text-dimmed' }"
            >
              <UAvatar
                :alt="authState.user?.name || 'Your account'"
                :src="authState.user?.avatar || undefined"
                size="sm"
                class="bg-accented/60 text-toned ring-1 ring-default"
                :ui="{ root: 'rounded-full', fallback: 'text-xs font-medium' }"
              />
            </UButton>
            <template #account>
              <div class="w-full min-w-ui-zero space-y-ui-2xs">
                <p class="truncate text-xs font-medium leading-normal text-highlighted">
                  {{ authState.user?.name || 'Your account' }}
                </p>
                <p
                  class="truncate text-xs font-normal leading-normal text-muted"
                  :title="authState.user?.email || undefined"
                >
                  {{ authState.user?.email }}
                </p>
              </div>
            </template>
          </UDropdownMenu>
        </ClientOnly>
      </template>
    </template>
  </UHeader>
</template>
