import * as z from 'zod'
import { itemKinds } from '../kernel/content'
import { idSchema, descriptionSchema, entityIconSchema } from './workspace'

export const itemInputSchema = z.object({
  kind: z.enum(itemKinds).default('document'),
  description: descriptionSchema.optional(),
  title: z.string().trim().min(1, 'Title is required').max(255),
  icon: entityIconSchema.nullable().optional(),
  folderId: idSchema.nullable().optional()
}).strict()
export const itemUpdateSchema = itemInputSchema.omit({ folderId: true, kind: true }).partial().refine(input => Object.keys(input).length > 0, 'Provide at least one field')
export const itemLocationSchema = z.object({ folderId: idSchema.nullable(), acknowledgement: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict()
export const contentSchema = z.object({ content: z.string().max(1000000) }).strict()
