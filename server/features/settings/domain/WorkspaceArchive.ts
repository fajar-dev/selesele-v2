import type { WorkspaceExportData } from './SettingsRepository'

export interface WorkspaceArchive {
  create(data: WorkspaceExportData): Promise<Uint8Array>
  attachmentBytes(data: WorkspaceExportData): Promise<number>
}
