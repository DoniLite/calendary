import { zodResolver } from '@hookform/resolvers/zod'
import { Image, Paintbrush, Server, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useTheme } from '../theme/theme-provider'
import { themes } from '../theme/themes'
import {
  apiPost,
  useWorkspaceIconMutation,
  useWorkspaceSettingsMutation,
  workspaceIconUrl,
  type CreatedInvitationResponse,
  type WorkspaceResponse,
} from '../../lib/api'
import { inviteCollaboratorSchema, workspaceSettingsSchema, type InviteCollaboratorFormInput, type InviteCollaboratorFormValues, type WorkspaceSettingsFormValues } from '../../lib/schemas'

const fallbackTimezones = ['UTC', 'Europe/Paris', 'Europe/London', 'Africa/Abidjan', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Dubai']

// `Intl.supportedValuesOf` isn't available in every runtime (older Safari, some SSR
// environments) — fall back to a short, still-useful list rather than crashing.
const timezoneOptions: string[] =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')
    : fallbackTimezones

export function SettingsView() {
  const { t } = useTranslation()
  const { activeWorkspace, user } = useWorkspaceSession()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>
      {user?.role === 'SUPER_ADMIN' && <CollaboratorInvitePanel />}
      <WorkspaceSetupCard workspace={activeWorkspace} />
      <div className="grid gap-4 md:grid-cols-2">
        <WorkspaceIconCard workspace={activeWorkspace} />
        <WorkspaceThemeCard workspace={activeWorkspace} />
      </div>
    </div>
  )
}

function WorkspaceSetupCard({ workspace }: { workspace?: WorkspaceResponse }) {
  const { t } = useTranslation()
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
      name: workspace?.name ?? '',
      publicSlug: workspace?.publicSlug ?? '',
      timezone: workspace?.defaultTimezone ?? 'Europe/Paris',
    },
  })
  const publicSlug = watch('publicSlug')

  useEffect(() => {
    reset({
      name: workspace?.name ?? '',
      publicSlug: workspace?.publicSlug ?? '',
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
          {t('settings.workspaceSetup.title')}
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.workspaceSetup.name')}</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.workspaceSetup.publicSlug')}</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('publicSlug')} />
            <FieldError message={errors.publicSlug?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.workspaceSetup.defaultTimezone')}</span>
            <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('timezone')}>
              {timezoneOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:col-span-3 md:flex-row md:items-center md:justify-between">
            <span>{t('settings.workspaceSetup.publicUrl')}: <span className="font-medium text-foreground">/p/{publicSlug}/calendar</span></span>
            <Button className="md:w-auto" disabled={settingsMutation.isPending || !workspace}>
              {settingsMutation.isPending ? t('settings.workspaceSetup.saving') : t('settings.workspaceSetup.save')}
            </Button>
          </div>
        </form>
        {settingsMutation.isSuccess && <div className="mt-3 rounded-md border border-available/30 bg-available/10 px-3 py-2 text-sm">{t('settings.workspaceSetup.saved')}</div>}
        {settingsMutation.isError && <div className="mt-3 rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{t('settings.workspaceSetup.error')}</div>}
      </PanelBody>
    </Panel>
  )
}

function CollaboratorInvitePanel() {
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('settings.collaborators.genericError'))
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t('settings.collaborators.title')}
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.collaborators.email')}</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="collaborator@example.com" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.collaborators.access')}</span>
            <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('accessLevel')}>
              <option value="READ">{t('settings.collaborators.read')}</option>
              <option value="WRITE">{t('settings.collaborators.write')}</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('settings.collaborators.expires')}</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" min={1} max={30} {...register('expiresInDays')} />
            <FieldError message={errors.expiresInDays?.message} />
          </label>
          <Button className="mt-auto" disabled={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden />
            {isSubmitting ? t('settings.collaborators.inviting') : t('settings.collaborators.invite')}
          </Button>
        </form>
        {error && <div className="mt-3 rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">{error}</div>}
        {createdInvitation && (
          <div className="mt-3 rounded-md border bg-background px-4 py-3 text-sm">
            <div className="font-medium">{t('settings.collaborators.createdFor', { email: createdInvitation.email })}</div>
            <div className="mt-2 break-all text-muted-foreground">{createdInvitation.token}</div>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

function WorkspaceIconCard({ workspace }: { workspace?: WorkspaceResponse }) {
  const { t } = useTranslation()
  const iconMutation = useWorkspaceIconMutation(workspace?.id)
  const iconUrl = workspaceIconUrl(workspace?.id, workspace?.hasCustomIcon)

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t('settings.icon.title')}
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="flex items-center gap-4">
        <img src={iconUrl} alt={workspace?.name ?? 'Calendary'} className="h-16 w-16 rounded-md border object-cover" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">{t('settings.icon.description')}</p>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            {iconMutation.isPending ? t('settings.icon.uploading') : t('settings.icon.upload')}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              disabled={!workspace || iconMutation.isPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void iconMutation.mutate(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
          {iconMutation.isError && <div className="text-xs text-busy">{t('settings.icon.error')}</div>}
        </div>
      </PanelBody>
    </Panel>
  )
}

function WorkspaceThemeCard({ workspace }: { workspace?: WorkspaceResponse }) {
  const { t } = useTranslation()
  const { themeId, setThemeId } = useTheme()

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t('settings.theme.title')}
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('settings.theme.description')}</p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              disabled={!workspace}
              onClick={() => setThemeId(theme.id)}
              className={`flex flex-col items-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                themeId === theme.id ? 'border-primary ring-2 ring-ring' : 'hover:bg-muted'
              }`}
            >
              <span className="h-6 w-6 rounded-full border" style={{ backgroundColor: theme.accent }} aria-hidden />
              {theme.label}
            </button>
          ))}
        </div>
      </PanelBody>
    </Panel>
  )
}
