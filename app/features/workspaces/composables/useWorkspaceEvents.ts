const eventName = 'sele:workspace-refresh'
/** Subscribe only while this feature is mounted; each view refreshes its own active data. */
export function useWorkspaceEvents(workspaceId: string, refresh: () => void) {
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === workspaceId) {
      refresh()
    }
  }
  onMounted(() => window.addEventListener(eventName, listener))
  onScopeDispose(() => {
    if (import.meta.client) {
      window.removeEventListener(eventName, listener)
    }
  })
}
export function notifyWorkspaceRefresh(workspaceId: string) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: workspaceId }))
}
