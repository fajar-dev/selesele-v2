import type { RealtimeEffects, RealtimeEvent } from '../domain/RealtimeRepository'
import type { CollaborationHub } from '../../../platform/collaboration/CollaborationHub'

export class CollaborationRealtimeEffects implements RealtimeEffects {
  constructor(private readonly collaboration: CollaborationHub) {}
  async apply(events: RealtimeEvent[]) {
    const workspaces = [...new Set(events.flatMap(event => event.workspaceId ? [event.workspaceId] : []))]
    for (const workspaceId of workspaces) {
      const relevant = events.filter(event => event.workspaceId === workspaceId)
      if (relevant.some(event => ['workspaces', 'items', 'access', 'members', 'groups', 'folders', 'settings'].includes(event.topic))) {
        await this.collaboration.revalidateWorkspace(workspaceId)
      }
      if (relevant.some(event => event.topic === 'presence')) {
        await this.collaboration.synchronizePresence(workspaceId)
      }
      if (relevant.some(event => event.topic === 'content')) {
        await this.collaboration.synchronizeWorkspace(workspaceId)
      }
    }
  }
}
