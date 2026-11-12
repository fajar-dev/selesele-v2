import type { PageService } from '../../pages/application/PageService'
import type { PageDocumentService } from '../../pages/application/PageDocumentService'
import { pageTemplates } from '../domain/templates'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class TemplateService {
  constructor(private readonly pages: PageService, private readonly documents: PageDocumentService) {}
  list() {
    return pageTemplates
  }

  async create(workspaceId: string, templateId: string, folderId: string | null, userId: string) {
    const template = pageTemplates.find(item => item.id === templateId)
    if (!template) {
      throw new ApplicationError('not_found', 'Template not found')
    }
    const page = await this.pages.create(workspaceId, { title: template.title, icon: template.icon, folderId }, userId)
    await this.documents.replace(page.id, template.content, userId)
    return page
  }
}
