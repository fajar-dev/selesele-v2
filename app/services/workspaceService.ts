import type { ApiResponse } from '#shared/types/api'
import type { FolderItem, InviteRole, WorkspaceInvitation, WorkspaceItem, WorkspaceOverview } from '#shared/types/workspace'
import { apiService } from './apiService'

export class WorkspaceService {
  private path(id: string, suffix = '') {
    return `/workspaces/${encodeURIComponent(id)}${suffix}`
  }

  list() {
    return apiService.request<ApiResponse<WorkspaceItem[]>>('/workspaces')
  }

  get(id: string) {
    return apiService.request<ApiResponse<WorkspaceOverview>>(this.path(id))
  }

  create(name: string) {
    return apiService.request<ApiResponse<WorkspaceItem>>('/workspaces', { method: 'POST', body: { name } })
  }

  rename(id: string, name: string) {
    return apiService.request(this.path(id), { method: 'PATCH', body: { name } })
  }

  delete(id: string) {
    return apiService.request(this.path(id), { method: 'DELETE' })
  }

  createFolder(id: string, name: string) {
    return apiService.request<ApiResponse<FolderItem>>(this.path(id, '/folders'), { method: 'POST', body: { name } })
  }

  renameFolder(id: string, folderId: string, name: string) {
    return apiService.request(this.path(id, `/folders/${encodeURIComponent(folderId)}`), { method: 'PATCH', body: { name } })
  }

  deleteFolder(id: string, folderId: string) {
    return apiService.request(this.path(id, `/folders/${encodeURIComponent(folderId)}`), { method: 'DELETE' })
  }

  invitations(id: string) {
    return apiService.request<ApiResponse<WorkspaceInvitation[]>>(this.path(id, '/invitations'))
  }

  invite(id: string, email: string, role: InviteRole) {
    return apiService.request(this.path(id, '/invitations'), { method: 'POST', body: { email, role } })
  }

  cancelInvitation(id: string, invitationId: string) {
    return apiService.request(this.path(id, `/invitations/${encodeURIComponent(invitationId)}`), { method: 'DELETE' })
  }

  changeRole(id: string, userId: string, role: InviteRole) {
    return apiService.request(this.path(id, `/members/${encodeURIComponent(userId)}`), { method: 'PATCH', body: { role } })
  }

  removeMember(id: string, userId: string) {
    return apiService.request(this.path(id, `/members/${encodeURIComponent(userId)}`), { method: 'DELETE' })
  }

  inbox() {
    return apiService.request<ApiResponse<WorkspaceInvitation[]>>('/invitations')
  }

  accept(invitationId: string) {
    return apiService.request<ApiResponse<{ workspaceId: string }>>(`/invitations/${encodeURIComponent(invitationId)}/accept`, { method: 'POST' })
  }

  decline(invitationId: string) {
    return apiService.request(`/invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' })
  }
}

export const workspaceService = new WorkspaceService()
