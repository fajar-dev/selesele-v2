<script setup lang="ts">
import { workspaceService } from '~/services/workspaceService'

const { state: auth } = useAuth()
const toast = useToast()
const createOpen = ref(false)
const busy = ref<string | null>(null)
const { data, error, refresh } = await useAsyncData('workspace-home', async () => {
  const [workspaces, invitations] = await Promise.all([workspaceService.list(), workspaceService.inbox()])
  return { workspaces: workspaces.data, invitations: invitations.data }
})
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
    <main class="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-9 app-enter">
      <section class="relative overflow-hidden rounded-2xl border border-default bg-muted/65 p-7 sm:p-10">
        <div class="relative z-10 max-w-xl">
          <p class="eyebrow mb-4 flex items-center gap-2"><UIcon name="i-lucide-sun" class="size-4 text-primary" /> A little space for big ideas</p>
          <h1 class="text-3xl sm:text-[2.5rem] font-semibold tracking-[-0.04em] text-highlighted leading-tight">Welcome back, {{ auth.user?.name?.split(' ')[0] || 'there' }}<span class="text-primary">.</span></h1>
          <p class="text-muted text-sm sm:text-base leading-relaxed mt-4 max-w-md">Your workspaces, notes, and shared ideas.<br class="hidden sm:block"> A place to make progress, together.</p>
          <UButton label="New workspace" icon="i-lucide-plus" color="primary" size="md" class="mt-7 shadow-sm" @click="createOpen = true" />
        </div>
        <WorkspacesCover seed="welcome" class="hidden md:block absolute! inset-y-0 right-0 w-[35%] h-full! opacity-85 [mask-image:linear-gradient(to_right,transparent,black_30%)]" />
      </section>
      <UAlert v-if="error" title="Unable to load workspaces" :description="errorMessage(error)" color="error">
        <template #actions><UButton label="Retry" color="neutral" variant="soft" @click="refresh()" /></template>
      </UAlert>
      <section v-if="data?.invitations.length" aria-label="Workspace invitations" class="space-y-3">
        <div class="flex items-center gap-2"><UIcon name="i-lucide-mail-open" class="size-4 text-primary" /><h2 class="text-sm font-semibold">You're invited</h2><UBadge color="primary" variant="soft" size="sm">{{ data.invitations.length }}</UBadge></div>
        <UCard v-for="invitation in data.invitations" :key="invitation.id" class="surface-card" :ui="{ body: 'p-4 sm:p-5' }">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3"><div class="size-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon name="i-lucide-users" class="size-5" /></div><div><p class="text-sm font-semibold">Join {{ invitation.workspaceName }}</p><p class="text-xs text-muted mt-1">{{ invitation.role }} access · Expires {{ new Date(invitation.expiresAt).toLocaleDateString() }}</p></div></div>
            <div class="flex gap-2"><UButton label="Decline" color="neutral" variant="ghost" :disabled="!!busy" @click="respond(invitation.id, false)" /><UButton label="Accept invitation" color="primary" :loading="busy === invitation.id" :disabled="!!busy" @click="respond(invitation.id, true)" /></div>
          </div>
        </UCard>
      </section>
      <section aria-label="Your workspaces" class="space-y-5">
        <div class="flex items-center justify-between"><div class="flex items-center gap-2.5"><UIcon name="i-lucide-panels-top-left" class="size-4 text-muted" /><h2 class="font-semibold text-base tracking-tight">Your workspaces</h2><UBadge color="neutral" variant="soft" size="sm">{{ data?.workspaces.length || 0 }}</UBadge></div><span class="text-xs text-muted hidden sm:block">A home for every project</span></div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink v-for="workspace in data?.workspaces" :key="workspace.id" :to="`/workspaces/${workspace.id}`" class="group rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
            <UCard class="workspace-card surface-card" :ui="{ body: 'p-0 sm:p-0' }">
              <WorkspacesCover :seed="workspace.id" />
              <div class="px-5 pb-5">
                <div class="workspace-mark size-12 text-2xl relative -mt-6 mb-4">{{ workspace.icon }}</div>
                <div class="flex items-center justify-between gap-3"><h3 class="font-semibold text-highlighted truncate">{{ workspace.name }}</h3><UIcon name="i-lucide-arrow-up-right" class="size-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></div>
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-muted"><UBadge :color="workspace.role === 'owner' ? 'primary' : 'neutral'" variant="soft" size="sm" class="capitalize">{{ workspace.role }}</UBadge><span class="text-xs text-muted">Open workspace</span></div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
        <UEmpty v-if="data && !data.workspaces.length" icon="i-lucide-notebook-pen" title="Your next chapter starts here" description="Bring your team, pages, and projects into one shared workspace." class="bg-muted/40 py-14 sm:py-18" :ui="{ avatar: 'bg-primary/10 text-primary ring-1 ring-primary/10', title: 'text-lg', description: 'max-w-sm' }">
          <template #actions><UButton label="Create your first workspace" icon="i-lucide-plus" color="primary" @click="createOpen = true" /></template>
        </UEmpty>
      </section>
      <div class="flex items-center gap-2 text-xs text-muted border-t border-muted pt-6"><UIcon name="i-lucide-sprout" class="size-4 text-primary" /><span>Good ideas grow when they have a place to live.</span></div>
    </main>
    <WorkspacesNameModal v-model:open="createOpen" title="Create workspace" description="A shared home for your team's pages and ideas." :on-save="create" />
  </div>
</template>
