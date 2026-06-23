import { Cloud, Globe2, Mail, Server, UserPlus, Video } from 'lucide-react'
import type { ComponentType } from 'react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { apiPost, type CreatedInvitationResponse, type WorkspaceAccessLevel } from '../../lib/api'

export function SettingsView() {
  const { activeWorkspace, user } = useWorkspaceSession()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Runtime configuration for email, storage and conferencing.</p>
      </div>
      {user?.role === 'SUPER_ADMIN' && <CollaboratorInvitePanel />}
      <WorkspaceSetupCard workspaceName={activeWorkspace?.name ?? 'Owner workspace'} />
      <section className="grid gap-4 xl:grid-cols-4">
        <SettingsCard icon={Mail} title="SMTP email" fields={['CALENDARY_MAIL_FROM', 'CALENDARY_MAIL_REPLY_TO', 'spring.mail.host']} />
        <SettingsCard icon={Cloud} title="Backblaze B2" fields={['CALENDARY_B2_ENABLED', 'CALENDARY_B2_BUCKET_NAME', 'CALENDARY_B2_BUCKET_ID']} />
        <SettingsCard icon={Video} title="Google Meet" fields={['CALENDARY_GOOGLE_CALENDAR_ENABLED', 'CALENDARY_GOOGLE_CALENDAR_ID', 'SERVICE_ACCOUNT_EMAIL']} />
        <SettingsCard icon={Globe2} title="Public base URL" fields={['CALENDARY_PUBLIC_BASE_URL', 'VITE_CALENDARY_WORKSPACE_ID']} />
      </section>
    </div>
  )
}

function WorkspaceSetupCard({ workspaceName }: { workspaceName: string }) {
  const [name, setName] = useState(workspaceName)
  const [publicSlug, setPublicSlug] = useState('doni')
  const [timezone, setTimezone] = useState('Europe/Paris')

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
          Workspace setup
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Workspace name</span>
          <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Public slug</span>
          <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={publicSlug} onChange={(event) => setPublicSlug(event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Default timezone</span>
          <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {['Europe/Paris', 'UTC', 'Africa/Abidjan', 'America/New_York', 'Asia/Tokyo'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground md:col-span-3">
          Public URL draft: <span className="font-medium text-foreground">/p/{publicSlug}/calendar</span>. Persisting these fields needs a backend workspace settings endpoint.
        </div>
      </PanelBody>
    </Panel>
  )
}

function CollaboratorInvitePanel() {
  const [email, setEmail] = useState('')
  const [accessLevel, setAccessLevel] = useState<Exclude<WorkspaceAccessLevel, 'OWNER'>>('READ')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitationResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCreatedInvitation(null)
    setIsSubmitting(true)
    try {
      const invitation = await apiPost<CreatedInvitationResponse>('/api/onboarding/invitations', {
        email,
        accessLevel,
        expiresInDays,
      })
      setCreatedInvitation(invitation)
      setEmail('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create invitation.')
    } finally {
      setIsSubmitting(false)
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
        <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" required />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Access</span>
            <select className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as Exclude<WorkspaceAccessLevel, 'OWNER'>)}>
              <option value="READ">Read</option>
              <option value="WRITE">Write</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Expires</span>
            <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" min={1} max={30} value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} />
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
