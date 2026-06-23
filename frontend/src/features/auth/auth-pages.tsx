import { AlertTriangle, KeyRound, Mail, Server, ShieldCheck, UserPlus } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { apiPatch, apiPost, type AuthenticatedUserResponse } from '../../lib/api'
import { useWorkspaceSession } from './workspace-session'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, refreshSession, user } = useWorkspaceSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await apiPost<AuthenticatedUserResponse>('/api/auth/login', { email, password })
      await refreshSession()
      await navigate({ to: nextRouteFor(user) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      void navigate({ to: nextRouteFor(user) })
    }
  }, [isAuthenticated, isLoading, navigate, user])

  return (
    <AuthFrame title="Sign in" subtitle="Access your Calendary workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field icon={Mail} label="Email">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@calendary.dev" required />
        </Field>
        <Field icon={KeyRound} label="Password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? 'Signing in' : 'Sign in'}</Button>
        <Link to="/p/doni/calendar" className="text-center text-sm text-muted-foreground hover:text-foreground">
          Back to public calendar
        </Link>
      </form>
    </AuthFrame>
  )
}

export function BootstrapPage() {
  const navigate = useNavigate()
  const { refreshSession } = useWorkspaceSession()
  const [setupArmed, setSetupArmed] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [email, setEmail] = useState('')
  const [workspaceName, setWorkspaceName] = useState('Owner workspace')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmation !== 'CREATE OWNER') {
      setError('Type CREATE OWNER to confirm server bootstrap.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await apiPost('/api/onboarding/super-admin', { email, workspaceName, password })
      const user = await apiPost<AuthenticatedUserResponse>('/api/auth/login', { email, password })
      await refreshSession()
      await navigate({ to: nextRouteFor(user) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to bootstrap server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!setupArmed) {
    return (
      <AuthFrame title="Server setup" subtitle="This page is only for the first owner account.">
        <div className="space-y-4">
          <div className="rounded-md border border-busy/30 bg-busy/10 p-4">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Controlled bootstrap
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue only if this is your server and no super admin account exists yet.
            </p>
          </div>
          <Button className="w-full" onClick={() => setSetupArmed(true)}>
            Start server setup
          </Button>
          <div className="grid gap-2 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">I already have an account</Link>
            <Link to="/p/doni/calendar" className="text-muted-foreground hover:text-foreground">Back to public calendar</Link>
          </div>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Bootstrap server" subtitle="Create the first super admin account.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field icon={Mail} label="Email">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@calendary.dev" required />
        </Field>
        <Field icon={Server} label="Workspace name">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Owner workspace" required />
        </Field>
        <Field icon={KeyRound} label="Password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
        </Field>
        <Field icon={AlertTriangle} label="Confirmation">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type CREATE OWNER" required />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? 'Creating' : 'Create super admin'}</Button>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSetupArmed(false)}>
          Cancel setup
        </button>
      </form>
    </AuthFrame>
  )
}

export function AcceptInvitationPage() {
  const navigate = useNavigate()
  const { refreshSession } = useWorkspaceSession()
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('token') ?? ''
  })
  const [workspaceName, setWorkspaceName] = useState('My workspace')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await apiPost<{ email: string }>('/api/onboarding/invitations/accept', { token, workspaceName, password })
      const authenticatedUser = await apiPost<AuthenticatedUserResponse>('/api/auth/login', { email: user.email, password })
      await refreshSession()
      await navigate({ to: nextRouteFor(authenticatedUser) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to accept invitation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Accept invitation" subtitle="Create your collaborator account and private workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field icon={UserPlus} label="Invitation token">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token" required />
        </Field>
        <Field icon={Server} label="Workspace name">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="My workspace" required />
        </Field>
        <Field icon={KeyRound} label="New password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? 'Accepting' : 'Accept invitation'}</Button>
      </form>
    </AuthFrame>
  )
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, refreshSession, isLoading } = useWorkspaceSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const updatedUser = await apiPatch<AuthenticatedUserResponse>('/api/auth/password', { currentPassword, newPassword })
      await refreshSession()
      await navigate({ to: nextRouteFor(updatedUser) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      void navigate({ to: '/login' })
    }
  }, [isLoading, navigate, user])

  return (
    <AuthFrame title="Change password" subtitle="Set a permanent password before opening your workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field icon={ShieldCheck} label="Current password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        </Field>
        <Field icon={KeyRound} label="New password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting || isLoading}>{isSubmitting ? 'Saving' : 'Save password'}</Button>
      </form>
    </AuthFrame>
  )
}

function nextRouteFor(user: AuthenticatedUserResponse): '/change-password' | '/collab' | '/app/calendar' {
  if (user.passwordChangeRequired) return '/change-password'
  return user.role === 'COLLABORATOR' ? '/collab' : '/app/calendar'
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Panel className="w-full max-w-md">
        <PanelHeader>
          <div className="flex items-center gap-3">
            <img src="/avatar.jpeg" alt="Calendary" className="h-11 w-11 rounded-md border object-cover" />
            <div>
              <PanelTitle>{title}</PanelTitle>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </PanelHeader>
        <PanelBody>{children}</PanelBody>
      </Panel>
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  )
}
