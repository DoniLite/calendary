import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Mail, Shield, UserMinus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { apiPost, useRemoveMemberMutation, useWorkspaceMembersQuery, type CreatedInvitationResponse } from '../../lib/api'
import { inviteCollaboratorSchema, type InviteCollaboratorFormInput, type InviteCollaboratorFormValues } from '../../lib/schemas'

export function CollaboratorsView() {
  const { activeWorkspace, activeWorkspaceId, user } = useWorkspaceSession()
  const membersQuery = useWorkspaceMembersQuery(activeWorkspaceId)
  const removeMember = useRemoveMemberMutation(activeWorkspaceId)
  const [createdInvitations, setCreatedInvitations] = useState<CreatedInvitationResponse[]>([])
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
    try {
      const invitation = await apiPost<CreatedInvitationResponse>('/api/onboarding/invitations', values)
      setCreatedInvitations((current) => [invitation, ...current])
      reset({ email: '', accessLevel: values.accessLevel, expiresInDays: values.expiresInDays })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create invitation.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Collaborators</h1>
          <p className="text-sm text-muted-foreground">Invite collaborators and review workspace access boundaries.</p>
        </div>
        <Badge tone={activeWorkspace?.accessLevel === 'OWNER' ? 'success' : 'muted'}>{activeWorkspace?.accessLevel ?? 'NO'} ACCESS</Badge>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
              Invite collaborator
            </PanelTitle>
          </PanelHeader>
          <PanelBody>
            <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]" onSubmit={handleSubmit(onSubmit)}>
              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Email
                </span>
                <input className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="collaborator@example.com" {...register('email')} />
                <FieldError message={errors.email?.message} />
              </label>
              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  Access
                </span>
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
              <Button className="mt-auto" disabled={isSubmitting || user?.role !== 'SUPER_ADMIN'}>
                <UserPlus className="h-4 w-4" aria-hidden />
                {isSubmitting ? 'Inviting' : 'Invite'}
              </Button>
            </form>
            {error && <div className="mt-3 rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">{error}</div>}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              Workspace access
            </PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {membersQuery.isPending && <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Loading members...</div>}
            {membersQuery.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to load members.</div>}
            {!membersQuery.isPending && !membersQuery.data?.items.length && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">No members yet.</div>
            )}
            {membersQuery.data?.items.map((member) => (
              <article key={member.id} className={member.id === user?.id ? 'rounded-md border border-primary/40 bg-primary/5 p-3' : 'rounded-md border p-3'}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{member.email}</div>
                    {member.id === user?.id && <div className="text-xs text-muted-foreground">You</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={member.accessLevel === 'OWNER' ? 'success' : member.accessLevel === 'WRITE' ? 'default' : 'muted'}>{member.accessLevel}</Badge>
                    {activeWorkspace?.accessLevel === 'OWNER' && member.id !== user?.id && (
                      <Button variant="secondary" className="h-8" disabled={removeMember.isPending} onClick={() => removeMember.mutate(member.id)}>
                        <UserMinus className="h-3.5 w-3.5" aria-hidden />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {removeMember.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to remove this collaborator.</div>}
          </PanelBody>
        </Panel>
      </section>

      <Panel>
        <PanelHeader>
          <PanelTitle>Created invitation tokens</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-3">
          {!createdInvitations.length && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">New invitations will appear here during this session.</div>}
          {createdInvitations.map((invitation) => (
            <article key={invitation.id} className="rounded-md border bg-background p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{invitation.email}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{invitation.accessLevel} access · expires {new Date(invitation.expiresAt).toLocaleString()}</div>
                  <div className="mt-2 break-all rounded-md bg-muted px-3 py-2 text-xs">{invitation.token}</div>
                </div>
                <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(invitation.token)}>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </Button>
              </div>
            </article>
          ))}
        </PanelBody>
      </Panel>
    </div>
  )
}
