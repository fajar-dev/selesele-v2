<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
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
    :class="insideWorkspace ? '[--ui-header-height:3.25rem]' : '[--ui-header-height:3.75rem]'"
    :toggle="false"
    :ui="{
      container: insideWorkspace ? 'max-w-none w-full px-4 sm:px-6 lg:px-6 gap-4' : 'max-w-5xl w-full px-5 sm:px-10 lg:px-10 gap-4',
      left: 'min-w-0 flex-1 gap-3',
      right: 'shrink-0 flex-none lg:flex-none gap-2'
    }"
  >
    <template #left>
      <NuxtLink
        v-if="!insideWorkspace"
        to="/"
        class="inline-flex shrink-0 items-center gap-2.5 rounded-[4px] text-[15px] font-semibold tracking-[-0.025em] text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="SeleSele home"
      >
        <img
          class="size-6 object-contain grayscale dark:invert"
          src="/logo.png"
          alt=""
        >
        <span>SeleSele</span>
      </NuxtLink>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
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
              content: 'w-60',
              viewport: 'divide-muted',
              label: 'px-2 py-2 font-normal',
              item: 'px-2 py-2 text-[13px] font-normal',
              itemLeadingIcon: 'size-4',
              itemTrailingIcon: 'size-3.5'
            }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              aria-label="Account menu"
              trailing-icon="i-lucide-chevron-down"
              class="gap-2 px-2 py-1.5 hover:bg-accented/40"
              :ui="{ trailingIcon: 'size-3 text-dimmed' }"
            >
              <UAvatar
                :alt="authState.user?.name || 'Your account'"
                :src="authState.user?.avatar || undefined"
                size="xs"
                class="bg-accented/60 text-toned"
                :ui="{ root: 'rounded-full', fallback: 'text-[11px] font-medium' }"
              />
              <span class="hidden sm:block max-w-36 truncate text-[13px] font-medium text-toned">{{ authState.user?.name || 'Your account' }}</span>
            </UButton>
            <template #account>
              <div class="w-full min-w-0 space-y-0.5">
                <p class="truncate text-[13px] font-medium leading-5 text-highlighted">
                  {{ authState.user?.name || 'Your account' }}
                </p>
                <p
                  class="truncate text-xs font-normal leading-5 text-muted"
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
