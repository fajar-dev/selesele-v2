import * as z from 'zod'
import { DEFAULT_WORKSPACE_ICON } from '../kernel/icons'

export const idSchema = z.uuid()
const nameSchema = z.string().trim().min(1, 'Name is required').max(120)
export const entityIconSchema = z.string().trim().min(1).max(32)
export const descriptionSchema = z.string().trim().max(2000)
const workspaceFields = z.object({ name: nameSchema, description: descriptionSchema, icon: entityIconSchema }).strict()
export const workspaceInputSchema = workspaceFields.partial({ description: true }).extend({ icon: workspaceFields.shape.icon.default(DEFAULT_WORKSPACE_ICON) })
export const workspaceUpdateSchema = workspaceFields.partial().refine(input => Object.keys(input).length > 0, 'Provide at least one field')
export const folderInputSchema = z.object({ name: nameSchema }).strict()
export const folderUpdateSchema = z.object({ name: nameSchema.optional(), description: descriptionSchema.optional(), icon: entityIconSchema.nullable().optional() }).strict().refine(input => Object.keys(input).length > 0, 'Provide at least one field')
