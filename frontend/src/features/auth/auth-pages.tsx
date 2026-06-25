import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, KeyRound, Mail, Server, ShieldCheck, UserPlus } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { apiPatch, apiPost, fetchDefaultPublicProfile, publicWorkspaceIconUrl, useForgotPasswordMutation, useResetPasswordMutation, useVerifyEmailMutation, type AuthenticatedUserResponse } from '../../lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  acceptInvitationSchema,
  bootstrapSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type AcceptInvitationFormValues,
  type BootstrapFormValues,
  type ChangePasswordFormValues,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type ResetPasswordFormValues,
} from '../../lib/schemas'
import { useWorkspaceSession } from './workspace-session'

export function LoginPage() {
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('auth.login.genericError'))
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      void navigate({ to: nextRouteFor(user) })
    }
  }, [isAuthenticated, isLoading, navigate, user])

  return (
    <AuthFrame title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={Mail} label={t('auth.email')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="owner@calendary.dev" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </Field>
        <Field icon={KeyRound} label={t('auth.password')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" placeholder={t('auth.password')} {...register('password')} />
          <FieldError message={errors.password?.message} />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}</Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            {t('auth.login.backToPublicCalendar')}
          </Link>
        </div>
      </form>
    </AuthFrame>
  )
}

export function BootstrapPage() {
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('auth.bootstrap.genericError'))
    }
  }

  if (!setupArmed) {
    return (
      <AuthFrame title={t('auth.bootstrap.gateTitle')} subtitle={t('auth.bootstrap.gateSubtitle')}>
        <div className="space-y-4">
          <div className="rounded-md border border-busy/30 bg-busy/10 p-4">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {t('auth.bootstrap.controlledBootstrap')}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('auth.bootstrap.controlledBootstrapBody')}
            </p>
          </div>
          <Button className="w-full" onClick={() => setSetupArmed(true)}>
            {t('auth.bootstrap.start')}
          </Button>
          <div className="grid gap-2 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">{t('auth.bootstrap.alreadyHaveAccount')}</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">{t('auth.bootstrap.backToPublicCalendar')}</Link>
          </div>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title={t('auth.bootstrap.title')} subtitle={t('auth.bootstrap.subtitle')}>
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={Mail} label={t('auth.email')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="owner@calendary.dev" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </Field>
        <Field icon={Server} label={t('auth.workspaceName')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Owner workspace" {...register('workspaceName')} />
          <FieldError message={errors.workspaceName?.message} />
        </Field>
        <Field icon={KeyRound} label={t('auth.password')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </Field>
        <Field icon={AlertTriangle} label={t('auth.bootstrap.confirmation')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={t('auth.bootstrap.confirmationPlaceholder')} {...register('confirmation')} />
          <FieldError message={errors.confirmation?.message} />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? t('auth.bootstrap.submitting') : t('auth.bootstrap.submit')}</Button>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSetupArmed(false)}>
          {t('auth.bootstrap.cancel')}
        </button>
      </form>
    </AuthFrame>
  )
}

export function AcceptInvitationPage() {
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('auth.acceptInvitation.genericError'))
    }
  }

  return (
    <AuthFrame title={t('auth.acceptInvitation.title')} subtitle={t('auth.acceptInvitation.subtitle')}>
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={UserPlus} label={t('auth.acceptInvitation.token')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={t('auth.acceptInvitation.tokenPlaceholder')} {...register('token')} />
          <FieldError message={errors.token?.message} />
        </Field>
        <Field icon={Server} label={t('auth.workspaceName')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="My workspace" {...register('workspaceName')} />
          <FieldError message={errors.workspaceName?.message} />
        </Field>
        <Field icon={KeyRound} label={t('auth.acceptInvitation.newPassword')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting}>{isSubmitting ? t('auth.acceptInvitation.submitting') : t('auth.acceptInvitation.submit')}</Button>
      </form>
    </AuthFrame>
  )
}

export function ChangePasswordPage() {
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('auth.changePassword.genericError'))
    }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      void navigate({ to: '/login' })
    }
  }, [isLoading, navigate, user])

  return (
    <AuthFrame title={t('auth.changePassword.title')} subtitle={t('auth.changePassword.subtitle')}>
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field icon={ShieldCheck} label={t('auth.changePassword.currentPassword')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('currentPassword')} />
          <FieldError message={errors.currentPassword?.message} />
        </Field>
        <Field icon={KeyRound} label={t('auth.changePassword.newPassword')}>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" {...register('newPassword')} />
          <FieldError message={errors.newPassword?.message} />
        </Field>
        {error && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">{error}</p>}
        <Button disabled={isSubmitting || isLoading}>{isSubmitting ? t('auth.changePassword.submitting') : t('auth.changePassword.submit')}</Button>
      </form>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const mutation = useForgotPasswordMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  async function onSubmit(values: ForgotPasswordFormValues) {
    await mutation.mutateAsync(values.email)
    setSent(true)
  }

  return (
    <AuthFrame title="Forgot password" subtitle="We'll send you a reset link.">
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-md border border-available/30 bg-available/10 p-4 text-sm">
            If an account with that email exists, a reset link has been sent. Check your inbox.
          </div>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Field icon={Mail} label="Email">
            <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="you@example.com" autoFocus {...register('email')} />
            <FieldError message={errors.email?.message} />
          </Field>
          {mutation.isError && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to process request. Try again later.</p>}
          <Button disabled={isSubmitting}>Send reset link</Button>
          <Link to="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
        </form>
      )}
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') ?? '' : ''
  const [done, setDone] = useState(false)
  const mutation = useResetPasswordMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: '' } })

  async function onSubmit(values: ResetPasswordFormValues) {
    await mutation.mutateAsync({ token, newPassword: values.newPassword })
    setDone(true)
    setTimeout(() => { void navigate({ to: '/login' }) }, 2000)
  }

  if (!token) {
    return (
      <AuthFrame title="Invalid link" subtitle="This reset link is missing or malformed.">
        <Link to="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">Request a new link</Link>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Reset password" subtitle="Choose a new password for your account.">
      {done ? (
        <div className="rounded-md border border-available/30 bg-available/10 p-4 text-sm">
          Password updated. Redirecting to login…
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Field icon={KeyRound} label="New password">
            <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="password" placeholder="12+ characters" autoFocus {...register('newPassword')} />
            <FieldError message={errors.newPassword?.message} />
          </Field>
          {mutation.isError && <p className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Invalid or expired link. Request a new one.</p>}
          <Button disabled={isSubmitting}>Set new password</Button>
          <Link to="/forgot-password" className="text-center text-sm text-muted-foreground hover:text-foreground">Request a new link</Link>
        </form>
      )}
    </AuthFrame>
  )
}

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') ?? '' : ''
  const mutation = useVerifyEmailMutation()
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    mutation.mutate(token, {
      onSuccess: () => {
        setDone(true)
        setTimeout(() => { void navigate({ to: '/login' }) }, 3000)
      },
      onError: () => setError('This verification link is invalid or has expired.'),
    })
  // Run once on mount — mutation ref is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) {
    return (
      <AuthFrame title="Invalid link" subtitle="This verification link is missing or malformed.">
        <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Email verification" subtitle="Confirming your new email address.">
      {done ? (
        <div className="space-y-3">
          <div className="rounded-md border border-available/30 bg-available/10 p-4 text-sm">
            Email address confirmed. Redirecting to login…
          </div>
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-md border border-busy/30 bg-busy/10 p-4 text-sm">{error}</div>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-muted-foreground">Verifying…</div>
      )}
    </AuthFrame>
  )
}

function nextRouteFor(user: AuthenticatedUserResponse): '/change-password' | '/collab' | '/app/calendar' {
  if (user.passwordChangeRequired) return '/change-password'
  return user.role === 'COLLABORATOR' ? '/collab' : '/app/calendar'
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  // Anonymous visitors land here before any session exists, so the only branding available
  // is whatever the default (super admin) workspace has published publicly.
  const profileQuery = useQuery({
    queryKey: ['public-profile', 'default'],
    queryFn: fetchDefaultPublicProfile,
    retry: false,
  })
  const iconUrl = publicWorkspaceIconUrl(profileQuery.data?.publicSlug, profileQuery.data?.hasCustomIcon)

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Panel className="w-full max-w-md">
        <PanelHeader>
          <div className="flex items-center gap-3">
            <img src={iconUrl} alt="Calendary" className="h-11 w-11 rounded-md border object-cover" />
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
