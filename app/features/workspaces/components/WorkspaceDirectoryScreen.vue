<script setup lang="ts">
import LayoutToggle from '~/components/ui/LayoutToggle.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceDirectory } from '~/features/workspaces/composables/useWorkspaceDirectory'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'
import AppHeader from '~/components/shell/AppHeader.vue'
import PageToolbar from '~/components/ui/PageToolbar.vue'
import WorkspaceDirectoryCard from './WorkspaceDirectoryCard.vue'
import { useWorkspaceCreation } from '~/features/workspaces/composables/useWorkspaceCreation'

const { invitations: invitationApi } = useApi()

const toast = useToast()
const { createWorkspace, creatingWorkspace } = useWorkspaceCreation()
const busy = ref<string | null>(null)
const search = ref('')
const scope = ref<'all' | 'owned' | 'shared'>('all')
const ownedCount = computed(() => data.value.filter(workspace => workspace.role === 'owner').length)
const filters = computed(() => [
  { value: 'all' as const, label: 'All workspaces', shortLabel: 'All', count: data.value.length },
  { value: 'owned' as const, label: 'Owned by you', shortLabel: 'Owned', count: ownedCount.value },
  { value: 'shared' as const, label: 'Shared with you', shortLabel: 'Shared', count: data.value.length - ownedCount.value }
])
const savedLayout = useCookie<string>('workspace-directory-layout', { default: () => 'list', sameSite: 'lax', maxAge: 31536000 })
const view = computed<'list' | 'grid'>({
  get: () => savedLayout.value === 'grid' ? 'grid' : 'list',
  set: (value) => {
    savedLayout.value = value
  }
})
const { data, error, status, refresh: refreshDirectory } = useWorkspaceDirectory()
const { data: invitations, error: inboxError, status: inboxStatus, refresh: refreshInbox } = useLazyAsyncData(
  workspaceKeys.inbox, async () => (await invitationApi.inbox()).data, { server: false, default: () => [] }
)
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const inboxLoading = computed(() => inboxStatus.value === 'idle' || inboxStatus.value === 'pending')
const refresh = () => Promise.all([refreshDirectory(), refreshInbox()])
const workspaces = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return data.value.filter(workspace => workspace.name.toLocaleLowerCase().includes(query)
    && (scope.value === 'all' || (scope.value === 'owned' ? workspace.role === 'owner' : workspace.role !== 'owner')))
})
async function respond(id: string, accept: boolean) {
  busy.value = id
  try {
    if (accept) {
      const response = await invitationApi.accept(id)
      invitations.value = invitations.value.filter(item => item.id !== id)
      void refreshDirectory()
      await navigateTo(`/workspaces/${response.data.workspaceId}`)
    } else {
      await invitationApi.decline(id)
      await refresh()
    }
  } catch (cause) {
    toast.add({ title: 'Unable to respond to invitation', description: errorMessage(cause), color: 'error' })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="directory-screen">
    <AppHeader />
    <main
      class="directory-shell app-enter"
      aria-label="All workspaces"
    >
      <header class="directory-heading">
        <div class="directory-heading-content">
          <div class="directory-heading-icon">
            <UIcon
              name="i-lucide-panels-top-left"
              class="size-6"
            />
          </div>
          <div><h1>Workspaces</h1><p>Your teams, projects, and shared knowledge.</p></div>
        </div>
        <UButton
          label="New workspace"
          icon="i-lucide-plus"
          :loading="creatingWorkspace"
          class="min-h-10 px-4"
          @click="createWorkspace"
        />
      </header>
      <UAlert
        v-if="error"
        title="Unable to load workspaces"
        :description="errorMessage(error)"
        color="error"
        :actions="[{ label: 'Retry', onClick: () => refreshDirectory() }]"
      />
      <div
        v-if="inboxLoading"
        class="directory-inbox-loading"
      >
        <USkeleton class="size-8" /><USkeleton class="h-4 w-52 max-w-[75%]" /><span
          class="sr-only"
          role="status"
        >Loading invitations</span>
      </div>
      <UAlert
        v-else-if="inboxError"
        title="Unable to load invitations"
        color="error"
        :actions="[{ label: 'Retry', onClick: () => refreshInbox() }]"
      />
      <section
        v-else-if="invitations.length"
        aria-label="Workspace invitations"
        class="directory-invitations"
      >
        <div class="directory-invitations-heading">
          <UIcon
            name="i-lucide-mail-open"
            class="size-4"
          /><h2>You’re invited</h2><UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ invitations.length }}
          </UBadge><span class="hidden sm:block ms-auto text-xs text-muted">Good work is better together.</span>
        </div>
        <ul class="divide-y divide-muted">
          <li
            v-for="invitation in invitations"
            :key="invitation.id"
            class="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1 basis-60">
              <div class="directory-invitation-icon">
                <UIcon
                  name="i-lucide-users"
                  class="size-4"
                />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-highlighted break-words">
                  {{ invitation.workspaceName }}
                </p><p class="text-xs text-muted mt-1">
                  <span class="capitalize">{{ invitation.role }}</span> access · Expires {{ formatCalendarDate(invitation.expiresAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                label="Decline"
                color="neutral"
                variant="ghost"
                :disabled="!!busy"
                @click="respond(invitation.id, false)"
              /><UButton
                label="Accept invitation"
                :loading="busy === invitation.id"
                :disabled="!!busy"
                @click="respond(invitation.id, true)"
              />
            </div>
          </li>
        </ul>
      </section>
      <section
        aria-label="Your workspaces"
        class="directory-collection"
      >
        <PageToolbar class="directory-toolbar">
          <template #left>
            <div
              role="group"
              aria-label="Filter workspaces"
              class="directory-filters"
            >
              <UButton
                v-for="filter in filters"
                :key="filter.value"
                :aria-pressed="scope === filter.value"
                :aria-label="filter.label"
                color="neutral"
                variant="ghost"
                class="directory-filter"
                :class="{ 'is-selected': scope === filter.value }"
                @click="scope = filter.value"
              >
                <span class="hidden sm:inline">{{ filter.label }}</span><span class="sm:hidden">{{ filter.shortLabel }}</span><USkeleton
                  v-if="loading"
                  class="h-3 w-3"
                /><span
                  v-else
                  class="directory-filter-count"
                >{{ filter.count }}</span>
              </UButton>
            </div>
          </template>
          <template #right>
            <UInput
              v-if="data.length"
              v-model="search"
              icon="i-lucide-search"
              placeholder="Find a workspace…"
              aria-label="Search workspaces"
              size="sm"
              class="directory-search w-40 sm:w-56"
            />
            <LayoutToggle
              v-model="view"
              label="Workspace layout"
            />
          </template>
        </PageToolbar>
        <DataSkeleton
          v-if="loading"
          label="Loading workspace directory"
          class="mt-5"
        />
        <div
          v-if="!loading && view === 'list' && workspaces.length"
          class="directory-list-heading"
          aria-hidden="true"
        >
          <span>Workspace</span><span>Created</span><span>Access</span><span />
        </div>
        <ul
          v-if="!loading && workspaces.length"
          :class="view === 'grid' ? 'directory-grid' : 'directory-list'"
          :data-layout="view"
        >
          <li
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="min-w-0"
          >
            <WorkspaceDirectoryCard
              :workspace="workspace"
              :layout="view"
            />
          </li>
        </ul>
        <UEmpty
          v-else-if="!loading && !error && !data.length"
          variant="naked"
          icon="i-lucide-panels-top-left"
          title="Create your first workspace"
          description="Start a project or bring your team together in one shared space."
          class="directory-empty"
          :ui="{ avatar: 'bg-accented/30 text-toned ring-0 rounded-[6px]', title: 'text-xl', description: 'max-w-sm' }"
        >
          <template #actions>
            <UButton
              label="Create workspace"
              icon="i-lucide-plus"
              :loading="creatingWorkspace"
              @click="createWorkspace"
            />
          </template>
        </UEmpty>
        <UEmpty
          v-else-if="!loading && !error"
          variant="naked"
          icon="i-lucide-search"
          :title="search ? 'No matching workspaces' : scope === 'owned' ? 'No workspaces owned by you' : 'No shared workspaces yet'"
          :description="search ? 'Try another name or clear your search.' : 'Workspaces in this category will appear here.'"
          class="py-12 border-t-0"
          :ui="{ avatar: 'bg-transparent text-muted ring-0' }"
        >
          <template #actions>
            <UButton
              :label="search ? 'Clear search' : 'Show all workspaces'"
              color="neutral"
              variant="outline"
              @click="search = ''; scope = 'all'"
            />
          </template>
        </UEmpty>
      </section>
      <footer
        v-if="!loading && !error && data.length"
        class="directory-footer"
      >
        <span>{{ workspaces.length }} {{ workspaces.length === 1 ? 'workspace' : 'workspaces' }}<template v-if="search || scope !== 'all'"> of {{ data.length }}</template></span><span>Choose a workspace to pick up your work.</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.directory-screen { min-height: 100svh; background: var(--app-sidebar); }
.directory-shell { width: 100%; max-width: 1200px; margin-inline: auto; padding: 44px 20px 28px; }
.directory-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 22px; margin-bottom: 35px; }
.directory-heading-content { display: flex; align-items: center; gap: 16px; min-width: 0; }
.directory-heading-icon { display: grid; place-items: center; flex-shrink: 0; width: 49px; height: 51px; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-bg); color: var(--ui-text-highlighted); box-shadow: 0 2px 3px #00000003; }
.directory-heading h1 { font-size: 29px; font-weight: 600; letter-spacing: -1.1px; line-height: 1.2; color: var(--ui-text-highlighted); }
.directory-heading p { font-size: 12px; color: var(--ui-text-muted); margin-top: 7px; line-height: 1.6; }
.directory-collection { background: var(--ui-bg); border: 1px solid var(--ui-border); border-radius: 7px; padding: 10px 20px 0; overflow: hidden; }
.directory-filters { display: flex; align-items: center; gap: 3px; }
.directory-filter { font-size: 12px; padding: 9px 10px; gap: 7px; color: var(--ui-text-muted); white-space: nowrap; }
.directory-filter.is-selected { background: var(--ui-bg-accented); color: var(--ui-text-highlighted); }
.directory-filter-count { display: inline-grid; place-items: center; min-width: 17px; font-size: 10px; color: var(--ui-text-muted); font-variant-numeric: tabular-nums; }
.directory-filter.is-selected .directory-filter-count { color: var(--ui-text-highlighted); }
.directory-list-heading { display: grid; grid-template-columns: minmax(0, 1fr) 140px 76px 30px; gap: 20px; padding: 17px 6px 12px; font-size: 10px; color: var(--ui-text-muted); border-bottom: 1px solid var(--ui-border-muted); }
.directory-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; padding-block: 20px; }
.directory-list { margin-bottom: -1px; }
.directory-empty { padding-block: 65px; border-top: none; }
.directory-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 15px 2px 0; font-size: 11px; color: var(--ui-text-muted); }
.directory-inbox-loading { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.directory-invitations { border: 1px solid var(--ui-border); background: var(--ui-bg); border-radius: 6px; padding: 16px 20px 0; margin-bottom: 24px; }
.directory-invitations-heading { display: flex; align-items: center; gap: 9px; padding-bottom: 13px; border-bottom: 1px solid var(--ui-border-muted); font-size: 12px; font-weight: 500; }
.directory-invitation-icon { display: grid; place-items: center; width: 35px; height: 35px; flex-shrink: 0; border: 1px solid var(--ui-border-muted); border-radius: 5px; background: var(--ui-bg-muted); }
@media (min-width: 640px) {
  .directory-shell { padding: 48px 40px 28px; }
  .directory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1100px) {
  .directory-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 1023px) {
  .directory-toolbar { flex-wrap: wrap; row-gap: 4px; }
  .directory-toolbar :deep([data-slot=left]) { flex-basis: 100%; overflow-x: auto; }
  .directory-toolbar :deep([data-slot=right]) { width: 100%; justify-content: space-between; padding-bottom: 12px; }
  .directory-search { flex: 1; width: auto; }
  .directory-list-heading { grid-template-columns: minmax(0, 1fr) 65px 30px; }
  .directory-list-heading > span:nth-child(2) { display: none; }
}
@media (max-width: 639px) {
  .directory-list-heading { grid-template-columns: minmax(0, 1fr) 55px 25px; gap: 5px; padding-inline: 0; }
  .directory-heading { margin-bottom: 26px; gap: 20px; }
  .directory-heading h1 { font-size: 26px; }
  .directory-heading-content { gap: 12px; }
  .directory-heading-icon { width: 42px; height: 44px; }
  .directory-heading p { font-size: 11px; }
  .directory-collection { padding-inline: 12px; }
  .directory-filter { font-size: 11px; padding-inline: 7px; gap: 4px; }
  .directory-filters { gap: 3px; width: 100%; }
  .directory-filter { flex: 1; justify-content: center; }
}
</style>
