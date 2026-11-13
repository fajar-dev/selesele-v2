import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { WorkspaceArchive } from '../domain/WorkspaceArchive'
import type { WorkspaceExportData } from '../domain/SettingsRepository'
import type { ImageStore } from '../../media/domain/ImageStore'
import { ApplicationError } from '../../../core/errors/ApplicationError'

const attachmentPattern = /(?:https?:\/\/[^\s)"<>]+)?\/images\/([a-f0-9-]{36}\.(?:png|jpg|gif|webp))/gi
const safeName = (value: string) => value.normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 70) || 'Untitled'
export class BunWorkspaceArchive implements WorkspaceArchive {
  constructor(private readonly images: ImageStore, private readonly directory: string) { }
  private attachments(data: WorkspaceExportData) {
    const allowed = new Set(data.attachments)
    return [...new Set(data.pages.flatMap(page => [...page.markdown.matchAll(attachmentPattern)].map(match => match[1]!)))].filter(filename => allowed.has(filename))
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
    const paths = new Map(data.pages.map(page => [page.id, `${page.folderId ? `${safeName(data.folders.find(folder => folder.id === page.folderId)?.name || 'Folder')}-${page.folderId}/` : ''}${safeName(page.title)}-${page.id}.md`]))
    let total = 0
    for (const page of data.pages) {
      const depth = page.folderId ? '../' : './'
      const content = `# ${page.title}\n\n${page.markdown.replace(attachmentPattern, (_match, filename: string) => `${depth}attachments/${filename}`)}`
      total += Buffer.byteLength(content)
      if (total > 50 * 1024 * 1024) {
        throw new ApplicationError('invalid_input', 'Workspace export exceeds the 50 MB limit')
      }
      files[paths.get(page.id)!] = content
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
    files['workspace.json'] = JSON.stringify({ name: data.name, pages: data.pages.map(page => ({ id: page.id, title: page.title, path: paths.get(page.id) })) }, null, 2)
    return new Uint8Array(await new Bun.Archive(files, { compress: 'gzip' }).bytes())
  }
}
