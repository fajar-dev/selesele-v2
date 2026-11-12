import * as z from 'zod'
import { idSchema, descriptionSchema, entityIconSchema } from './workspace'

export const pageInputSchema = z.object({
  description: descriptionSchema.optional(),
  title: z.string().trim().min(1, 'Title is required').max(255),
  icon: entityIconSchema.nullable().optional(),
  folderId: idSchema.nullable().optional()
}).strict()
export const pageUpdateSchema = pageInputSchema.omit({ folderId: true }).partial().refine(input => Object.keys(input).length > 0, 'Provide at least one field')
export const pageLocationSchema = z.object({ folderId: idSchema.nullable() }).strict()
export const contentSchema = z.object({ content: z.string().max(1000000) }).strict()
