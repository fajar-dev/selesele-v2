import type { ItemKind } from './content'

export interface ObjectReference { type: 'task' | 'element' | 'node' | 'edge', id: string }
export interface SearchFilters { kind?: ItemKind, createdBy?: string, folderId?: string, updatedAfter?: string, updatedBefore?: string, label?: string }
export interface SavedSearch { id: string, name: string, query: string, workspaceId: string | null, filters: SearchFilters }
export interface ItemAttachment { id: string, itemId: string, name: string, mime: string, size: number, anchor: ObjectReference | null, createdAt: string }
export interface ItemRelation { outgoing?: boolean, id: string, sourceId: string, targetId: string, sourceAnchor: ObjectReference | null, targetAnchor: ObjectReference | null, label: string, targetTitle: string, targetKind: ItemKind, workspaceId: string }
