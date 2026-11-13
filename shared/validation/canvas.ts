import * as z from 'zod'
import { canvasColors } from '../kernel/content'
import { idSchema } from './workspace'

const point = z.number().finite().min(-100000).max(100000)
const color = z.enum(canvasColors)
const label = z.string().trim().min(1).max(120)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
const task = z.object({ id: idSchema, number: z.number().int().positive(), title: z.string().trim().min(1).max(255), description: z.string().max(20000), columnId: idSchema, priority: z.enum(['low', 'normal', 'high', 'urgent']), assigneeId: idSchema.nullable(), dueDate: date.nullable(), labels: z.array(z.string().trim().min(1).max(40)).max(20), checklist: z.array(z.object({ id: idSchema, title: z.string().trim().min(1).max(255), done: z.boolean() }).strict()).max(100), createdAt: z.iso.datetime() }).strict()
const kanban = z.object({ kind: z.literal('kanban'), columns: z.array(z.object({ id: idSchema, title: label, limit: z.number().int().min(1).max(1000).nullable() }).strict()).min(1).max(20), tasks: z.array(task).max(1000), nextNumber: z.number().int().positive() }).strict()
const drawing = z.object({ id: idSchema, type: z.enum(['pen', 'rectangle', 'ellipse', 'line', 'arrow', 'text', 'sticky']), x: point, y: point, width: point, height: point, points: z.array(z.array(point).min(2).max(3)).max(10000), text: z.string().max(4000), color, size: z.number().min(1).max(32) }).strict()
const whiteboard = z.object({ kind: z.literal('whiteboard'), elements: z.array(drawing).max(2000) }).strict()
const diagram = z.object({ kind: z.literal('diagram'), nodes: z.array(z.object({ id: idSchema, type: z.literal('shape'), position: z.object({ x: point, y: point }).strict(), data: z.object({ label: z.string().max(4000), shape: z.enum(['rectangle', 'ellipse', 'diamond', 'note']), color, width: z.number().min(60).max(2000), height: z.number().min(40).max(2000) }).strict() }).strict()).max(1000), edges: z.array(z.object({ id: idSchema, source: idSchema, target: idSchema, sourceHandle: z.string().max(30).nullable(), targetHandle: z.string().max(30).nullable(), label: z.string().max(255), type: z.enum(['smoothstep', 'straight', 'step']) }).strict()).max(2000) }).strict()
export const canvasContentSchema = z.discriminatedUnion('kind', [kanban, whiteboard, diagram])
export const canvasWriteSchema = z.object({ revision: z.number().int().nonnegative(), content: canvasContentSchema }).strict()
