import * as z from 'zod'

export const completionSchema = z.object({
  prompt: z.string().min(1).max(100000),
  mode: z.enum(['continue', 'fix', 'extend', 'reduce', 'simplify', 'summarize', 'translate']).default('continue'),
  language: z.string().trim().min(1).max(100).optional()
}).strict()

export type CompletionRequest = z.infer<typeof completionSchema>
export type CompletionMode = CompletionRequest['mode']
