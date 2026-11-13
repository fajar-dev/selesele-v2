import * as z from 'zod'
import { idSchema } from './workspace'

export const conversationTitleSchema = z.object({ title: z.string().trim().min(1).max(120) }).strict()
export const conversationQuestionSchema = z.object({ question: z.string().trim().min(3).max(1000), revision: z.number().int().nonnegative() }).strict()
export const templateSaveSchema = z.object({ itemId: idSchema, title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default('') }).strict()
export const archiveItemSchema = z.object({ archived: z.boolean() }).strict()
