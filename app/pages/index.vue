<script setup lang="ts">
import { workspaceService } from '~/services/workspaceService'

const toast = useToast()
const createOpen = ref(false)
const busy = ref<string | null>(null)
const search = ref('')
const { data, error, refresh } = await useAsyncData('workspace-home', async () => {
  const [workspaces, invitations] = await Promise.all([workspaceService.list(), workspaceService.inbox()])
  return { workspaces: workspaces.data, invitations: invitations.data }
})
const workspaces = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return data.value?.workspaces.filter(workspace => workspace.name.toLocaleLowerCase().includes(query)) || []
})
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
function createdDate(value: string) {
  return dateFormatter.format(new Date(value))
}
async function create(name: string) {
  const response = await workspaceService.create(name)
  await refresh()
  await navigateTo(`/workspaces/${response.data.id}`)
}
async function respond(id: string, accept: boolean) {
  busy.value = id
  try {
    if (accept) {
      const response = await workspaceService.accept(id)
      await refresh()
      await navigateTo(`/workspaces/${response.data.workspaceId}`)
    } else {
      await workspaceService.decline(id)
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
      <WorkspacesHeading
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
            @click="createOpen = true"
          />
        </template>
      </WorkspacesHeading>
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
      <section
        v-if="data?.invitations.length"
        aria-label="Workspace invitations"
        class="space-y-3"
      >
        <div class="flex items-center gap-2 text-sm font-medium">
          <UIcon
            name="i-lucide-mail-open"
            class="size-4 text-muted"
          />
          <h2>Invitations</h2>
          <span class="text-xs text-muted tabular-nums">{{ data.invitations.length }}</span>
        </div>
        <ul class="divide-y divide-muted border-y border-muted">
          <li
            v-for="invitation in data.invitations"
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
        <WorkspacesContentToolbar>
          <template #left>
            <h2 class="text-sm font-medium whitespace-nowrap">
              Your workspaces
            </h2>
            <span class="text-xs text-muted tabular-nums">{{ data?.workspaces.length || 0 }}</span>
          </template>
          <template #right>
            <UInput
              v-if="data?.workspaces.length"
              v-model="search"
              icon="i-lucide-search"
              placeholder="Find a workspace…"
              aria-label="Search workspaces"
              size="sm"
              class="w-36 sm:w-52"
            />
          </template>
        </WorkspacesContentToolbar>
        <ul
          v-if="workspaces.length"
          class="divide-y divide-muted"
        >
          <li
            v-for="workspace in workspaces"
            :key="workspace.id"
          >
            <NuxtLink
              :to="`/workspaces/${workspace.id}`"
              :aria-label="`Open ${workspace.name}`"
              class="group flex min-w-0 items-center gap-3 px-3 sm:px-4 py-5 -mx-3 sm:-mx-4 rounded-[5px] hover:bg-(--app-hover) focus-visible:outline-2 focus-visible:outline-primary transition-colors"
            >
              <div class="size-10 flex shrink-0 items-center justify-center rounded-[5px] border border-muted bg-muted">
                <UIcon
                  name="i-lucide-panels-top-left"
                  class="size-5 text-toned"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-sm sm:text-base text-highlighted truncate">{{ workspace.name }}</h3>
                <p class="text-xs text-muted mt-1">Created {{ createdDate(workspace.createdAt) }}</p>
              </div>
              <UBadge
                color="neutral"
                variant="soft"
                size="sm"
                class="capitalize shrink-0"
              >{{ workspace.role }}</UBadge>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-dimmed shrink-0 group-hover:text-highlighted transition-colors"
              />
            </NuxtLink>
          </li>
        </ul>
        <UEmpty
          v-else-if="data && !data.workspaces.length"
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
              @click="createOpen = true"
            />
          </template>
        </UEmpty>
        <UEmpty
          v-else-if="data"
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
    <WorkspacesNameModal
      v-model:open="createOpen"
      title="Create workspace"
      description="A shared home for your team's pages and ideas."
      :on-save="create"
    />
  </div>
</template>
