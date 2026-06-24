import { zodResolver } from '@hookform/resolvers/zod'
import { Cloud, Globe2, Mail, Server, UserPlus, Video } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { apiPost, useWorkspaceSettingsMutation, type CreatedInvitationResponse, type WorkspaceResponse } from '../../lib/api'
import { inviteCollaboratorSchema, workspaceSettingsSchema, type InviteCollaboratorFormInput, type InviteCollaboratorFormValues, type WorkspaceSettingsFormValues } from '../../lib/schemas'

export function SettingsView() {
  const { activeWorkspace, user } = useWorkspaceSession()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Runtime configuration for email, storage and conferencing.</p>
      </div>
      {user?.role === 'SUPER_ADMIN' && <CollaboratorInvitePanel />}
      <WorkspaceSetupCard workspace={activeWorkspace} />
      <section className="grid gap-4 xl:grid-cols-4">
        <SettingsCard icon={Mail} title="SMTP email" fields={['CALENDARY_MAIL_FROM', 'CALENDARY_MAIL_REPLY_TO', 'spring.mail.host']} />
        <SettingsCard icon={Cloud} title="Backblaze B2" fields={['CALENDARY_B2_ENABLED', 'CALENDARY_B2_BUCKET_NAME', 'CALENDARY_B2_BUCKET_ID']} />
        <SettingsCard icon={Video} title="Google Meet" fields={['CALENDARY_GOOGLE_CALENDAR_ENABLED', 'CALENDARY_GOOGLE_CALENDAR_ID', 'SERVICE_ACCOUNT_EMAIL']} />
        <SettingsCard icon={Globe2} title="Public base URL" fields={['CALENDARY_PUBLIC_BASE_URL', 'VITE_CALENDARY_PUBLIC_SLUG']} />
      </section>
    </div>
  )
}

function WorkspaceSetupCard({ workspace }: { workspace?: WorkspaceResponse }) {
  const settingsMutation = useWorkspaceSettingsMutation(workspace?.id)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WorkspaceSettingsFormValues>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      name: workspace?.name ?? 'Owner workspace',
      publicSlug: workspace?.publicSlug ?? 'doni',
      timezone: workspace?.defaultTimezone ?? 'Europe/Paris',
    },
  })
  const publicSlug = watch('publicSlug')

  useEffect(() => {
    reset({
      name: workspace?.name ?? 'Owner workspace',
      publicSlug: workspace?.publicSlug ?? 'doni',
      timezone: workspace?.defaultTimezone ?? 'Europe/Paris',
    })
  }, [workspace?.defaultTimezone, workspace?.name, workspace?.publicSlug, reset])

  function onSubmit(values: WorkspaceSettingsFormValues) {
    settingsMutation.mutate({
      name: values.name.trim(),
      publicSlug: values.publicSlug.trim().toLowerCase(),
      defaultTimezone: values.timezone,
    })
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
          Workspace setup
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Workspace name</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Public slug</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('publicSlug')} />
            <FieldError message={errors.publicSlug?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Default timezone</span>
            <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('timezone')}>
              {['Europe/Paris', 'UTC', 'Africa/Abidjan', 'America/New_York', 'Asia/Tokyo'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:col-span-3 md:flex-row md:items-center md:justify-between">
            <span>Public URL: <span className="font-medium text-foreground">/p/{publicSlug}/calendar</span></span>
            <Button className="md:w-auto" disabled={settingsMutation.isPending || !workspace}>
              {settingsMutation.isPending ? 'Saving' : 'Save workspace'}
            </Button>
          </div>
        </form>
        {settingsMutation.isSuccess && <div className="mt-3 rounded-md border border-available/30 bg-available/10 px-3 py-2 text-sm">Workspace settings saved.</div>}
        {settingsMutation.isError && <div className="mt-3 rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to save workspace settings.</div>}
      </PanelBody>
    </Panel>
  )
}

function CollaboratorInvitePanel() {
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitationResponse | null>(null)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteCollaboratorFormInput, unknown, InviteCollaboratorFormValues>({
    resolver: zodResolver(inviteCollaboratorSchema),
    defaultValues: { email: '', accessLevel: 'READ', expiresInDays: 7 },
  })

  async function onSubmit(values: InviteCollaboratorFormValues) {
    setError('')
    setCreatedInvitation(null)
    try {
      const invitation = await apiPost<CreatedInvitationResponse>('/api/onboarding/invitations', values)
      setCreatedInvitation(invitation)
      reset({ email: '', accessLevel: values.accessLevel, expiresInDays: values.expiresInDays })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create invitation.')
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
          Collaborators
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="collaborator@example.com" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Access</span>
            <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('accessLevel')}>
              <option value="READ">Read</option>
              <option value="WRITE">Write</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Expires</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" min={1} max={30} {...register('expiresInDays')} />
            <FieldError message={errors.expiresInDays?.message} />
          </label>
          <Button className="mt-auto" disabled={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden />
            {isSubmitting ? 'Inviting' : 'Invite'}
          </Button>
        </form>
        {error && <div className="mt-3 rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">{error}</div>}
        {createdInvitation && (
          <div className="mt-3 rounded-md border bg-background px-4 py-3 text-sm">
            <div className="font-medium">Invitation created for {createdInvitation.email}</div>
            <div className="mt-2 break-all text-muted-foreground">{createdInvitation.token}</div>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

function SettingsCard({ icon: Icon, title, fields }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; title: string; fields: string[] }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3">
        {fields.map((field) => (
          <label key={field} className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{field}</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Configured by environment" />
          </label>
        ))}
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Configured by backend environment.</div>
      </PanelBody>
    </Panel>
  )
}
