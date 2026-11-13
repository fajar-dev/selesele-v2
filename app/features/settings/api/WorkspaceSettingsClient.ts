import type { ApiTransport } from '~/core/http/ApiTransport'
import type { ApiResponse } from '#shared/contracts/api'
import type { WorkspaceSettingsOverview, WorkspaceUsage, WorkspaceActivityItem, WorkspaceSettingsChanges, WorkspaceNotificationPreferences } from '#shared/contracts/workspaceSettings'

export class WorkspaceSettingsClient {
  constructor(private readonly http: ApiTransport) {
  }

  get(id: string) {
    return this.http.request<ApiResponse<WorkspaceSettingsOverview>>(`/workspaces/${id}/settings`)
  }

  save(id: string, body: WorkspaceSettingsChanges) {
    return this.http.request<ApiResponse<WorkspaceSettingsOverview>>(`/workspaces/${id}/settings`, { method: 'PATCH', body })
  }

  notifications(id: string, body: WorkspaceNotificationPreferences) {
    return this.http.request(`/workspaces/${id}/notification-preferences`, { method: 'PATCH', body })
  }

  activity(id: string, cursor?: string) {
    return this.http.request<ApiResponse<WorkspaceActivityItem>>(`/workspaces/${id}/activity`, { query: { cursor } })
  }

  usage(id: string) {
    return this.http.request<ApiResponse<WorkspaceUsage>>(`/workspaces/${id}/usage`)
  }

  export(id: string) {
    return this.http.download(`/workspaces/${id}/export`)
  }

  archive(id: string, archived: boolean) {
    return this.http.request(`/workspaces/${id}/archive`, { method: 'POST', body: { archived } })
  }

  transfer(id: string, userId: string) {
    return this.http.request(`/workspaces/${id}/ownership`, { method: 'POST', body: { userId } })
  }

  leave(id: string) {
    return this.http.request(`/workspaces/${id}/leave`, { method: 'POST' })
  }
}
