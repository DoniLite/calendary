import { z } from 'zod'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$/

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const bootstrapSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmation: z.string().refine((value): boolean => value === 'CREATE OWNER', {
    message: 'Type CREATE OWNER to confirm',
  }),
})
export type BootstrapFormValues = z.infer<typeof bootstrapSchema>

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
})
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
})
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const workspaceSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  publicSlug: z.string().regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens'),
  timezone: z.string().min(1, 'Timezone is required'),
})
export type WorkspaceSettingsFormValues = z.infer<typeof workspaceSettingsSchema>

export const inviteCollaboratorSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  accessLevel: z.enum(['READ', 'WRITE']),
  expiresInDays: z.coerce.number().int().min(1, 'Minimum 1 day').max(30, 'Maximum 30 days'),
})
export type InviteCollaboratorFormValues = z.infer<typeof inviteCollaboratorSchema>
export type InviteCollaboratorFormInput = z.input<typeof inviteCollaboratorSchema>

export const proposeCollaborationSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  accessLevel: z.enum(['READ', 'WRITE']),
  message: z.string(),
})
export type ProposeCollaborationFormValues = z.infer<typeof proposeCollaborationSchema>

export const resourceFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string().min(1, 'Status is required'),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
  startsAt: z.string().min(1, 'Start time is required'),
  endsAt: z.string().min(1, 'End time is required'),
  project: z.string(),
  epic: z.string(),
  priority: z.string(),
  assigneeEmails: z.string(),
})
export type ResourceFormValues = z.infer<typeof resourceFormSchema>

export const bookingRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  message: z.string(),
})
export type BookingRequestFormValues = z.infer<typeof bookingRequestSchema>
