<script setup lang="ts">
import LayoutToggle from '~/components/ui/LayoutToggle.vue'
import EntityIcon from '~/components/ui/EntityIcon.vue'
import DataSkeleton from '~/components/ui/DataSkeleton.vue'
import { useWorkspaceDirectory } from '~/features/workspaces/composables/useWorkspaceDirectory'
import { workspaceKeys } from '~/features/workspaces/state/workspaceKeys'
import { useApi } from '~/core/http/useApi'
import AppHeader from '~/components/shell/AppHeader.vue'
import PageToolbar from '~/components/ui/PageToolbar.vue'
import PageHeading from '~/components/ui/PageHeading.vue'
import { useWorkspaceCreation } from '~/features/workspaces/composables/useWorkspaceCreation'

const { invitations: invitationApi } = useApi()

const toast = useToast()
const { createWorkspace, creatingWorkspace } = useWorkspaceCreation()
const busy = ref<string | null>(null)
const search = ref('')
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
  return data.value.filter(workspace => workspace.name.toLocaleLowerCase().includes(query))
})
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
function createdDate(value: string) {
  return dateFormatter.format(new Date(value))
}
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
  <div class="min-h-screen bg-default">
    <AppHeader />
    <main class="workspace-content workspace-content-start pb-14 space-y-8 app-enter">
      <PageHeading
        title="Workspaces"
        description="Choose where you want to work."
      >
        <template #icon>
          <UIcon
            name="i-lucide-panels-top-left"
            class="size-7"
          />
        </template>
        <template #actions>
          <UButton
            label="New workspace"
            icon="i-lucide-plus"
            size="md"
            :loading="creatingWorkspace"
            @click="createWorkspace"
          />
        </template>
      </PageHeading>
      <UAlert
        v-if="error"
        title="Unable to load workspaces"
        :description="errorMessage(error)"
        color="error"
      >
        <template #actions>
          <UButton
            label="Retry"
            color="neutral"
            variant="outline"
            @click="refresh()"
          />
        </template>
      </UAlert>
      <DataSkeleton
        v-if="inboxLoading"
        label="Loading invitations"
        :rows="2"
      />
      <UAlert
        v-else-if="inboxError"
        title="Unable to load invitations"
        color="error"
        :actions="[{ label: 'Retry', onClick: () => refreshInbox() }]"
      />
      <section
        v-else-if="invitations.length"
        aria-label="Workspace invitations"
        class="space-y-3"
      >
        <div class="flex items-center gap-2 text-sm font-medium">
          <UIcon
            name="i-lucide-mail-open"
            class="size-4 text-muted"
          />
          <h2>Invitations</h2>
          <span class="text-xs text-muted tabular-nums">{{ invitations.length }}</span>
        </div>
        <ul class="divide-y divide-muted border-y border-muted">
          <li
            v-for="invitation in invitations"
            :key="invitation.id"
            class="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1 basis-60">
              <UIcon
                name="i-lucide-users"
                class="size-5 text-muted shrink-0"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-highlighted break-words">
                  {{ invitation.workspaceName }}
                </p>
                <p class="text-xs text-muted mt-1">
                  <span class="capitalize">{{ invitation.role }}</span> access · Expires {{ createdDate(invitation.expiresAt) }}
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
              />
              <UButton
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
        class="space-y-1"
      >
        <PageToolbar>
          <template #left>
            <h2 class="text-sm font-medium whitespace-nowrap">
              Your workspaces
            </h2>
            <USkeleton
              v-if="loading"
              class="h-3 w-4"
            /><span
              v-else-if="!error"
              class="text-xs text-muted tabular-nums"
            >{{ data.length }}</span>
          </template>
          <template #right>
            <UInput
              v-if="data.length"
              v-model="search"
              icon="i-lucide-search"
              placeholder="Find a workspace…"
              aria-label="Search workspaces"
              size="sm"
              class="w-36 sm:w-52"
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
        />
        <ul
          v-else-if="workspaces.length"
          :class="view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3 py-3' : 'divide-y divide-muted'"
          :data-layout="view"
        >
          <li
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="min-w-0"
          >
            <NuxtLink
              :to="`/workspaces/${workspace.id}`"
              :aria-label="`Open ${workspace.name}`"
              class="group flex min-w-0 gap-3 rounded-[5px] hover:bg-(--app-hover) focus-visible:outline-2 focus-visible:outline-primary transition-colors"
              :class="view === 'grid' ? 'h-full min-h-48 flex-col items-start border border-muted p-5 hover:border-accented' : 'items-center px-3 sm:px-4 py-5 -mx-3 sm:-mx-4'"
            >
              <div
                class="flex shrink-0 items-center gap-3"
                :class="{ 'w-full justify-between': view === 'grid' }"
              >
                <div class="size-10 flex shrink-0 items-center justify-center rounded-[5px] border border-muted bg-muted">
                  <EntityIcon
                    :value="workspace.icon"
                    fallback="i-lucide-panels-top-left"
                    class="size-5 text-xl text-toned"
                  />
                </div>
                <UBadge
                  v-if="view === 'grid'"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="capitalize"
                >{{ workspace.role }}</UBadge>
              </div>
              <div
                class="min-w-0 flex-1"
                :class="{ 'w-full': view === 'grid' }"
              >
                <h3 class="font-medium text-sm sm:text-base text-highlighted truncate">{{ workspace.name }}</h3>
                <p
                  v-if="view === 'grid' && workspace.description"
                  class="text-xs text-muted leading-5 mt-1 line-clamp-2"
                >{{ workspace.description }}</p>
                <p
                  v-if="view === 'list'"
                  class="text-xs text-muted mt-1"
                >Created {{ createdDate(workspace.createdAt) }}</p>
              </div>
              <div
                class="flex shrink-0 items-center gap-3"
                :class="{ 'w-full justify-between': view === 'grid' }"
              >
                <UBadge
                  v-if="view === 'list'"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="capitalize"
                >{{ workspace.role }}</UBadge>
                <p
                  v-else
                  class="text-xs text-muted"
                >Created {{ createdDate(workspace.createdAt) }}</p>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 text-dimmed shrink-0 group-hover:text-highlighted transition-colors"
                />
              </div>
            </NuxtLink>
          </li>
        </ul>
        <UEmpty
          v-else-if="!error && !data.length"
          variant="naked"
          icon="i-lucide-panels-top-left"
          title="Create your first workspace"
          description="Keep your team, folders, and pages together."
          class="py-12 sm:py-16 border-t-0"
          :ui="{ avatar: 'bg-transparent text-muted ring-0', title: 'text-base', description: 'max-w-xs' }"
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
          v-else-if="!error"
          variant="naked"
          icon="i-lucide-search"
          title="No matching workspaces"
          description="Try another name or clear your search."
          class="py-12 border-t-0"
          :ui="{ avatar: 'bg-transparent text-muted ring-0' }"
        >
          <template #actions>
            <UButton
              label="Clear search"
              color="neutral"
              variant="outline"
              @click="search = ''"
            />
          </template>
        </UEmpty>
      </section>
    </main>
  </div>
</template>
