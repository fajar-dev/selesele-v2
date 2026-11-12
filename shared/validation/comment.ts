import * as z from 'zod'

const positionId = z.object({ client: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), clock: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).strict()
const position = z.object({
  type: positionId.optional(),
  tname: z.string().min(1).max(120).optional(),
  item: positionId.optional(),
  assoc: z.number().int().min(-1).max(1).optional()
}).strict().refine(value => !!value.type !== !!value.tname, 'A text position must identify one shared type')
export const commentBodySchema = z.object({ body: z.string().trim().min(1, 'Write a comment').max(5000) }).strict()
export const commentThreadSchema = commentBodySchema.extend({
  quote: z.string().min(1).max(10000).refine(value => !!value.trim(), 'Select some text'),
  anchor: z.object({ from: position, to: position }).strict()
}).strict()
export const commentResolutionSchema = z.object({ resolved: z.boolean() }).strict()
