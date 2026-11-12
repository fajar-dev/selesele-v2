import * as z from 'zod'
import { idSchema } from './workspace'

export const searchSchema = z.object({ q: z.string().trim().max(160).default(''), workspaceId: idSchema.optional() })
export const questionSchema = z.object({ question: z.string().trim().min(3).max(1000), workspaceId: idSchema }).strict()
export const favoriteSchema = z.object({ favorite: z.boolean() }).strict()
export const trashKindSchema = z.enum(['page', 'folder', 'workspace'])
export const templateInputSchema = z.object({ templateId: z.string().min(1).max(80), folderId: idSchema.nullable().optional() }).strict()
