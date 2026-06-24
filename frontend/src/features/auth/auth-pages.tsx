import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, KeyRound, Mail, Server, ShieldCheck, UserPlus } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { apiPatch, apiPost, fallbackPublicSlug, type AuthenticatedUserResponse } from '../../lib/api'
import {
  acceptInvitationSchema,
  bootstrapSchema,
  changePasswordSchema,
  loginSchema,
  type AcceptInvitationFormValues,
  type BootstrapFormValues,
  type ChangePasswordFormValues,
  type LoginFormValues,
} from '../../lib/schemas'
import { useWorkspaceSession } from './workspace-session'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, refreshSession, user } = useWorkspaceSession()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginFormValues) {
    setError('')
    try {
      const user = await apiPost<AuthenticatedUserResponse>('/api/auth/login', values)
      await refreshSession()
      await navigate({ to: nextRouteFor(user) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      void navigate({ to: nextRouteFor(user) })
    }
  }, [isAuthenticated, isLoading, navigate, user])

  return (
    <AuthFrame title="Sign in" subtitle="Access your Calendary workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={Mail} label="Email">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="owner@calendary.dev" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </Field>
        <Field icon={KeyRound} label="Password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" placeholder="Password" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? 'Signing in' : 'Sign in'}</Button>
        <Link to="/p/$publicSlug/calendar" params={{ publicSlug: fallbackPublicSlug }} className="text-center text-sm text-muted-foreground hover:text-foreground">
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
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapFormValues>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: { email: '', workspaceName: 'Owner workspace', password: '', confirmation: '' },
  })

  async function onSubmit(values: BootstrapFormValues) {
    setError('')
    try {
      await apiPost('/api/onboarding/super-admin', { email: values.email, workspaceName: values.workspaceName, password: values.password })
      const user = await apiPost<AuthenticatedUserResponse>('/api/auth/login', { email: values.email, password: values.password })
      await refreshSession()
      await navigate({ to: nextRouteFor(user) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to bootstrap server.')
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
            <Link to="/p/$publicSlug/calendar" params={{ publicSlug: fallbackPublicSlug }} className="text-muted-foreground hover:text-foreground">Back to public calendar</Link>
          </div>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Bootstrap server" subtitle="Create the first super admin account.">
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={Mail} label="Email">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="owner@calendary.dev" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </Field>
        <Field icon={Server} label="Workspace name">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Owner workspace" {...register('workspaceName')} />
          <FieldError message={errors.workspaceName?.message} />
        </Field>
        <Field icon={KeyRound} label="Password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </Field>
        <Field icon={AlertTriangle} label="Confirmation">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Type CREATE OWNER" {...register('confirmation')} />
          <FieldError message={errors.confirmation?.message} />
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
  const [error, setError] = useState('')
  const initialToken = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token') ?? ''
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token: initialToken, workspaceName: 'My workspace', password: '' },
  })

  async function onSubmit(values: AcceptInvitationFormValues) {
    setError('')
    try {
      const user = await apiPost<{ email: string }>('/api/onboarding/invitations/accept', values)
      const authenticatedUser = await apiPost<AuthenticatedUserResponse>('/api/auth/login', { email: user.email, password: values.password })
      await refreshSession()
      await navigate({ to: nextRouteFor(authenticatedUser) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to accept invitation.')
    }
  }

  return (
    <AuthFrame title="Accept invitation" subtitle="Create your collaborator account and private workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={UserPlus} label="Invitation token">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Paste token" {...register('token')} />
          <FieldError message={errors.token?.message} />
        </Field>
        <Field icon={Server} label="Workspace name">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="My workspace" {...register('workspaceName')} />
          <FieldError message={errors.workspaceName?.message} />
        </Field>
        <Field icon={KeyRound} label="New password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('password')} />
          <FieldError message={errors.password?.message} />
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
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  })

  async function onSubmit(values: ChangePasswordFormValues) {
    setError('')
    try {
      const updatedUser = await apiPatch<AuthenticatedUserResponse>('/api/auth/password', values)
      await refreshSession()
      await navigate({ to: nextRouteFor(updatedUser) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change password.')
    }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      void navigate({ to: '/login' })
    }
  }, [isLoading, navigate, user])

  return (
    <AuthFrame title="Change password" subtitle="Set a permanent password before opening your workspace.">
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={ShieldCheck} label="Current password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('currentPassword')} />
          <FieldError message={errors.currentPassword?.message} />
        </Field>
        <Field icon={KeyRound} label="New password">
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('newPassword')} />
          <FieldError message={errors.newPassword?.message} />
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
