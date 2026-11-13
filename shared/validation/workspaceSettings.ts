import * as z from 'zod'

const audience = z.enum(['managers', 'members'])
export const settingsInputSchema = z.object({
  permissions: z.object({ inviteMembers: audience, createPages: audience, createFolders: audience, deleteContent: audience }).strict(),
  homePageId: z.uuid().nullable(), trashRetentionDays: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)])
}).partial().strict().refine(value => Object.keys(value).length > 0, 'Provide a settings change')
export const notificationPreferencesSchema = z.object({
  email: z.object({ invitation: z.boolean(), comment: z.boolean(), reply: z.boolean(), mention: z.boolean() }).strict(), delivery: z.enum(['immediate', 'daily'])
}).strict()
export const archiveInputSchema = z.object({ archived: z.boolean() }).strict()
export const transferInputSchema = z.object({ userId: z.uuid() }).strict()
