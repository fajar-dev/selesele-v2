import * as z from 'zod'

const memberRoleSchema = z.enum(['admin', 'member', 'viewer'])
const accessLevelSchema = z.enum(['none', 'view', 'comment', 'edit'])
const expiry = z.iso.datetime().nullable()
export const addMembersSchema = z.object({
  emails: z.array(z.email().max(255).transform(value => value.toLowerCase())).min(1).max(100),
  role: memberRoleSchema.default('member'), groupIds: z.array(z.uuid()).max(50).default([]),
  grants: z.array(z.object({ kind: z.enum(['folder', 'item']), resourceId: z.uuid(), level: accessLevelSchema, expiresAt: expiry })).max(100).default([])
}).strict()
export const memberChangeSchema = z.object({ role: memberRoleSchema.optional(), suspended: z.boolean().optional() }).strict().refine(input => Object.keys(input).length > 0, 'Provide a change')
export const bulkMembersSchema = z.object({ memberIds: z.array(z.uuid()).min(1).max(100), action: z.enum(['role', 'suspend', 'restore', 'remove']), role: memberRoleSchema.optional() }).strict().refine(value => value.action !== 'role' || !!value.role, 'Choose a role')
export const memberDirectorySchema = z.object({ q: z.string().trim().max(120).default(''), role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(), status: z.enum(['active', 'suspended', 'unregistered']).optional(), groupId: z.uuid().optional(), cursor: z.uuid().optional() })
export const groupInputSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).default(''), memberIds: z.array(z.uuid()).max(1000).default([]) }).strict()
export const resourcePolicySchema = z.object({ mode: z.enum(['inherit', 'restricted']), grants: z.array(z.object({ memberId: z.uuid().nullable(), groupId: z.uuid().nullable(), level: accessLevelSchema, expiresAt: expiry }).strict().refine(value => Number(!!value.memberId) + Number(!!value.groupId) === 1, 'Choose one member or group')).max(1000) }).strict()
export const memberGrantSchema = z.object({ kind: z.enum(['folder', 'item']), resourceId: z.uuid(), level: accessLevelSchema.nullable(), expiresAt: expiry }).strict()
