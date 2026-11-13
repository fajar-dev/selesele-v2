import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { WorkspaceArchive } from '../domain/WorkspaceArchive'
import type { WorkspaceExportData } from '../domain/SettingsRepository'
import type { ImageStore } from '../../media/domain/ImageStore'
import { ApplicationError } from '../../../core/errors/ApplicationError'

const attachmentPattern = /(?:https?:\/\/[^\s)"<>]+)?\/images\/([a-f0-9-]{36}\.(?:png|jpg|gif|webp))/gi
const safeName = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 70) || 'Untitled'
export class BunWorkspaceArchive implements WorkspaceArchive {
  constructor(private readonly images: ImageStore, private readonly directory: string) {
  }

  private attachments(data: WorkspaceExportData) {
    const allowed = new Set(data.attachments)
    return [...new Set(data.items.flatMap(item => [...item.markdown.matchAll(attachmentPattern)].map(match => match[1]!)))].filter(filename => allowed.has(filename))
  }

  async attachmentBytes(data: WorkspaceExportData) {
    let bytes = 0
    for (const filename of this.attachments(data)) {
      try {
        bytes += (await stat(join(this.directory, filename))).size
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error
        }
      }
    }
    return bytes
  }

  async create(data: WorkspaceExportData) {
    const files: Record<string, string | Uint8Array> = {}
    const paths = new Map(data.items.map(item => [item.id, `${item.folderId ? `${safeName(data.folders.find(folder => folder.id === item.folderId)?.name || 'Folder')}-${item.folderId}/` : ''}${safeName(item.title)}-${item.id}.${item.kind === 'document' ? 'md' : 'json'}`]))
    let total = 0
    for (const item of data.items) {
      const depth = item.folderId ? '../' : './'
      const content = item.kind !== 'document' ? JSON.stringify(item.canvas, null, 2) : `# ${item.title}\n\n${item.markdown.replace(attachmentPattern, (_match, filename: string) => `${depth}attachments/${filename}`)}`
      total += Buffer.byteLength(content)
      if (total > 50 * 1024 * 1024) {
        throw new ApplicationError('invalid_input', 'Workspace export exceeds the 50 MB limit')
      }
      files[paths.get(item.id)!] = content
    }
    for (const filename of this.attachments(data)) {
      const image = await this.images.read(filename)
      if (image) {
        total += image.byteLength
        if (total > 50 * 1024 * 1024) {
          throw new ApplicationError('invalid_input', 'Workspace export exceeds the 50 MB limit')
        }
        files[`attachments/${filename}`] = image
      }
    }
    files['workspace.json'] = JSON.stringify({ name: data.name, items: data.items.map(item => ({ id: item.id, title: item.title, kind: item.kind, path: paths.get(item.id) })) }, null, 2)
    return new Uint8Array(await new Bun.Archive(files, { compress: 'gzip' }).bytes())
  }
}
