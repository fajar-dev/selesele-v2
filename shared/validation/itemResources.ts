import * as z from 'zod'
import { idSchema } from './workspace'
import { itemKinds } from '../model/content'

export const objectReferenceSchema = z.object({ type: z.enum(['task', 'element', 'node', 'edge']), id: idSchema }).strict()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
export const searchFiltersSchema = z.object({ kind: z.enum(itemKinds).optional(), createdBy: idSchema.optional(), folderId: idSchema.optional(), updatedAfter: date.optional(), updatedBefore: date.optional(), label: z.string().trim().max(40).optional() }).strict()
export const savedSearchSchema = z.object({ name: z.string().trim().min(1).max(80), query: z.string().trim().max(160), workspaceId: idSchema.nullable(), filters: searchFiltersSchema }).strict()
export const relationSchema = z.object({ targetId: idSchema, sourceAnchor: objectReferenceSchema.nullable().default(null), targetAnchor: objectReferenceSchema.nullable().default(null), label: z.string().trim().min(1).max(120).default('Related') }).strict()
