import type { ItemResourceRepository } from '../domain/ItemResourceRepository'
import type { ItemAccess } from '../../items/domain/ItemAccess'
import type { CanvasRepository } from '../../canvases/domain/CanvasRepository'
import type { ObjectReference, ItemRelation, SavedSearch } from '../../../../shared/model/itemResources'
import { attachmentName, attachmentType } from '../domain/attachmentPolicy'
import { ApplicationError } from '../../../core/errors/ApplicationError'

export class ItemResourceService {
  constructor(private readonly repository: ItemResourceRepository, private readonly items: ItemAccess, private readonly canvases: CanvasRepository) { }
  private async anchor(itemId: string, anchor: ObjectReference | null) {
    if (!anchor) {
      return
    }
    const content = (await this.canvases.find(itemId))?.content
    const exists = content?.kind === 'kanban' ? anchor.type === 'task' && content.tasks.some(task => task.id === anchor.id) : content?.kind === 'whiteboard' ? anchor.type === 'element' && content.elements.some(element => element.id === anchor.id) : content?.kind === 'diagram' ? (anchor.type === 'node' && content.nodes.some(node => node.id === anchor.id)) || (anchor.type === 'edge' && content.edges.some(edge => edge.id === anchor.id)) : false
    if (!exists) {
      throw new ApplicationError('invalid_input', 'The linked object no longer exists')
    }
  }

  async list(itemId: string, userId: string) {
    await this.items.get(itemId, userId)
    const relations: ItemRelation[] = []
    for (const relation of await this.repository.relations(itemId)) {
      const outgoing = relation.sourceId === itemId, targetId = outgoing ? relation.targetId : relation.sourceId
      try {
        const target = await this.items.get(targetId, userId)
        relations.push({ ...relation, outgoing, sourceId: itemId, targetId, sourceAnchor: outgoing ? relation.sourceAnchor : relation.targetAnchor, targetAnchor: outgoing ? relation.targetAnchor : relation.sourceAnchor, targetTitle: target.title, targetKind: target.kind, workspaceId: target.workspaceId })
      } catch { /* Hidden targets must not disclose their identity or title. */ }
    }
    return { attachments: await this.repository.attachments(itemId), relations }
  }

  async content(itemId: string, id: string, userId: string) {
    await this.items.get(itemId, userId)
    const file = await this.repository.attachment(itemId, id)
    if (!file) {
      throw new ApplicationError('not_found', 'Attachment not found')
    }
    return file
  }

  async attach(itemId: string, userId: string, name: string, data: Uint8Array, anchor: ObjectReference | null) {
    await this.items.writable(itemId, userId)
    await this.anchor(itemId, anchor)
    if ((await this.repository.attachments(itemId)).length >= 100) {
      throw new ApplicationError('invalid_input', 'An item supports up to 100 attachments')
    }
    let mime: string
    try {
      mime = attachmentType(data, name)
    } catch (cause) {
      throw new ApplicationError('invalid_input', cause instanceof Error ? cause.message : 'Unsupported file')
    }
    return this.repository.attach({ itemId, name: attachmentName(name), mime, size: data.length, anchor }, data, userId)
  }

  async detach(itemId: string, id: string, userId: string) {
    await this.items.writable(itemId, userId)
    await this.repository.detach(itemId, id)
  }

  async relate(itemId: string, userId: string, value: {
    targetId: string
    sourceAnchor: ObjectReference | null
    targetAnchor: ObjectReference | null
    label: string
  }) {
    await this.items.writable(itemId, userId)
    await this.items.get(value.targetId, userId)
    if (itemId === value.targetId && !value.sourceAnchor && !value.targetAnchor) {
      throw new ApplicationError('invalid_input', 'Choose another item or a specific object')
    }
    await this.anchor(itemId, value.sourceAnchor)
    await this.anchor(value.targetId, value.targetAnchor)
    await this.repository.relate({ ...value, sourceId: itemId }, userId)
  }

  async unlink(itemId: string, id: string, userId: string) {
    await this.items.writable(itemId, userId)
    await this.repository.unlink(itemId, id)
  }

  searches(userId: string) {
    return this.repository.searches(userId)
  }

  async saveSearch(userId: string, value: Omit<SavedSearch, 'id'>) {
    if ((await this.repository.searches(userId)).length >= 50) {
      throw new ApplicationError('invalid_input', 'Keep up to 50 saved searches')
    }
    await this.repository.saveSearch(userId, value)
  }

  removeSearch(userId: string, id: string) {
    return this.repository.removeSearch(userId, id)
  }
}
