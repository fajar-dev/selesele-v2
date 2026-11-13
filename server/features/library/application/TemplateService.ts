import type { PageService } from '../../pages/application/PageService'
import type { PageDocumentService } from '../../pages/application/PageDocumentService'
import type { WorkspaceTemplateRepository } from '../domain/WorkspaceTemplateRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import { pageTemplates } from '../domain/templates'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class TemplateService {
  constructor(private readonly pages: PageService, private readonly documents: PageDocumentService, private readonly repository: WorkspaceTemplateRepository, private readonly access: WorkspaceAuthorization, private readonly resources: ResourceAccess) { }
  list() {
    return pageTemplates
  }

  async workspace(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    const visible = new Set((await this.resources.visible('page', workspaceId, userId)).map(item => item.id))
    return (await this.repository.list(workspaceId)).filter(item => visible.has(item.sourcePageId)).map(({ content: _content, ...item }) => item)
  }

  async save(workspaceId: string, userId: string, input: {
    pageId: string
    title: string
    description: string
  }) {
    await this.access.requireManager(workspaceId, userId)
    const page = await this.pages.writable(input.pageId, userId)
    if (page.workspaceId !== workspaceId) {
      throw new ApplicationError('not_found', 'Page not found')
    }
    const content = await this.documents.content(page.id, userId)
    const saved = await this.repository.save({ workspaceId, sourcePageId: page.id, title: input.title, description: input.description, icon: page.icon || '📄', content })
    return { id: saved.id }
  }

  async remove(workspaceId: string, userId: string, id: string) {
    await this.access.requireManager(workspaceId, userId)
    await this.access.requireWritable(workspaceId, userId)
    const template = await this.repository.find(workspaceId, id)
    if (!template) {
      throw new ApplicationError('not_found', 'Template not found')
    }
    await this.pages.get(template.sourcePageId, userId)
    await this.repository.remove(workspaceId, id)
  }

  async create(workspaceId: string, templateId: string, folderId: string | null, userId: string) {
    let template = pageTemplates.find(item => item.id === templateId)
    if (!template) {
      const custom = await this.repository.find(workspaceId, templateId)
      if (custom) {
        await this.pages.get(custom.sourcePageId, userId)
        template = custom
      }
    }
    if (!template) {
      throw new ApplicationError('not_found', 'Template not found')
    }
    return this.pages.create(workspaceId, { title: template.title, description: template.description, icon: template.icon, folderId }, userId, template.content)
  }
}
