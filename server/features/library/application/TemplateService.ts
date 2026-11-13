import type { ItemService } from '../../items/application/ItemService'
import type { ItemContentService } from '../../items/application/ItemContentService'
import type { WorkspaceTemplateRepository } from '../domain/WorkspaceTemplateRepository'
import type { WorkspaceAuthorization } from '../../workspaces/domain/WorkspaceAuthorization'
import type { ResourceAccess } from '../../access/domain/ResourceAccess'
import { itemTemplates } from '../domain/templates'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class TemplateService {
  constructor(private readonly items: ItemService, private readonly documents: ItemContentService, private readonly repository: WorkspaceTemplateRepository, private readonly access: WorkspaceAuthorization, private readonly resources: ResourceAccess) {
  }

  list() {
    return itemTemplates
  }

  async workspace(workspaceId: string, userId: string) {
    await this.access.requireMember(workspaceId, userId)
    const visible = new Set((await this.resources.visible('item', workspaceId, userId)).map(item => item.id))
    return (await this.repository.list(workspaceId)).filter(item => visible.has(item.sourceItemId)).map(({ content: _content, ...item }) => item)
  }

  async save(workspaceId: string, userId: string, input: {
    itemId: string
    title: string
    description: string
  }) {
    await this.access.requireManager(workspaceId, userId)
    const item = await this.items.writable(input.itemId, userId)
    if (item.workspaceId !== workspaceId) {
      throw new ApplicationError('not_found', 'Item not found')
    }
    const content = await this.documents.content(item.id, userId)
    const saved = await this.repository.save({ workspaceId, sourceItemId: item.id, kind: item.kind, title: input.title, description: input.description, icon: item.icon || '📄', content })
    return { id: saved.id }
  }

  async remove(workspaceId: string, userId: string, id: string) {
    await this.access.requireManager(workspaceId, userId)
    await this.access.requireWritable(workspaceId, userId)
    const template = await this.repository.find(workspaceId, id)
    if (!template) {
      throw new ApplicationError('not_found', 'Template not found')
    }
    await this.items.get(template.sourceItemId, userId)
    await this.repository.remove(workspaceId, id)
  }

  async create(workspaceId: string, templateId: string, folderId: string | null, userId: string) {
    let template = itemTemplates.find(item => item.id === templateId)
    if (!template) {
      const custom = await this.repository.find(workspaceId, templateId)
      if (custom) {
        await this.items.get(custom.sourceItemId, userId)
        template = custom
      }
    }
    if (!template) {
      throw new ApplicationError('not_found', 'Template not found')
    }
    return this.items.create(workspaceId, { kind: template.kind, title: template.title, description: template.description, icon: template.icon, folderId }, userId, template.content)
  }
}
