import type { ItemTemplate } from '../../../../../shared/model/library'
import { documentTemplates } from './documents'
import { kanbanTemplates } from './kanban'
import { whiteboardTemplates } from './whiteboards'
import { diagramTemplates } from './diagrams'

export const itemTemplates: ItemTemplate[] = [...documentTemplates, ...kanbanTemplates, ...whiteboardTemplates, ...diagramTemplates]
