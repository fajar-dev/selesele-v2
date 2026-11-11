import * as z from 'zod'

export const idSchema = z.uuid()
export const nameSchema = z.string().trim().min(1, 'Name is required').max(120)
export const workspaceInputSchema = z.object({ name: nameSchema, icon: z.string().trim().min(1).max(32).default('🏡') }).strict()
export const workspaceUpdateSchema = workspaceInputSchema.partial().refine(input => Object.keys(input).length > 0, 'Provide a name or icon')
export const folderInputSchema = z.object({ name: nameSchema }).strict()
export const inviteRoleSchema = z.enum(['admin', 'member'])
export const invitationInputSchema = z.object({ email: z.email().max(255).transform(email => email.toLowerCase()), role: inviteRoleSchema.default('member') }).strict()
export const memberRoleSchema = z.object({ role: inviteRoleSchema }).strict()
