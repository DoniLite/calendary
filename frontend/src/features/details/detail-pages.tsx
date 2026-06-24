import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, CalendarClock, CheckSquare2, Edit3, Layers3, Paperclip, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { RichMarkdownEditor } from '../../components/rich-markdown-editor'
import { useWorkspaceSession } from '../auth/workspace-session'
import {
  useAttachmentMutations,
  useAttachmentQuery,
  useCollaborationMutations,
  useEventQuery,
  useProjectQuery,
  useResourceMutations,
  useTaskQuery,
  type CalendarColorPreset,
  type CalendarVisibility,
  type EventResponse,
  type EventStatus,
  type MemberSummaryResponse,
  type ProjectResponse,
  type ProjectStatus,
  type ProjectType,
  type ResourceType,
  type TaskPriority,
  type TaskResponse,
  type TaskStatus,
} from '../../lib/api'
import { itemColors, type ItemColor } from '../../lib/demo-data'
import { proposeCollaborationSchema, resourceFormSchema, type ProposeCollaborationFormValues, type ResourceFormValues } from '../../lib/schemas'
import { cn } from '../../lib/utils'

type ResourceKind = 'EVENT' | 'TASK' | 'PROJECT' | 'EPIC'
type EditorMode = 'create' | 'edit'

type ResourceDraft = {
  title: string
  status: string
  visibility: 'PRIVATE' | 'PUBLIC'
  startsAt: string
  endsAt: string
  project: string
  epic: string
  priority: string
  color: ItemColor
  markdown: string
}

function paramKeyFor(kind: ResourceKind): 'taskId' | 'projectId' | 'epicId' | 'eventId' {
  if (kind === 'TASK') return 'taskId'
  if (kind === 'PROJECT') return 'projectId'
  if (kind === 'EPIC') return 'epicId'
  return 'eventId'
}

function useResourceIdParam(kind: ResourceKind): string | undefined {
  const params = useParams({ strict: false }) as Record<string, string | undefined>
  return params[paramKeyFor(kind)]
}

const resourceMeta = {
  EVENT: { label: 'Event', icon: CalendarClock },
  TASK: { label: 'Task', icon: CheckSquare2 },
  PROJECT: { label: 'Project', icon: Layers3 },
  EPIC: { label: 'Epic', icon: Layers3 },
} satisfies Record<ResourceKind, { label: string; icon: typeof CalendarClock }>

export function EventCreatePage() {
  return <ResourceEditor kind="EVENT" mode="create" />
}

export function EventDetailPage() {
  return <ResourceDetail kind="EVENT" />
}

export function EventEditPage() {
  return <ResourceEditor kind="EVENT" mode="edit" />
}

export function TaskCreatePage() {
  return <ResourceEditor kind="TASK" mode="create" />
}

export function TaskDetailPage() {
  return <ResourceDetail kind="TASK" />
}

export function TaskEditPage() {
  return <ResourceEditor kind="TASK" mode="edit" />
}

export function ProjectCreatePage() {
  return <ResourceEditor kind="PROJECT" mode="create" />
}

export function ProjectDetailPage() {
  return <ResourceDetail kind="PROJECT" />
}

export function ProjectEditPage() {
  return <ResourceEditor kind="PROJECT" mode="edit" />
}

export function EpicCreatePage() {
  return <ResourceEditor kind="EPIC" mode="create" />
}

export function EpicDetailPage() {
  return <ResourceDetail kind="EPIC" />
}

export function EpicEditPage() {
  return <ResourceEditor kind="EPIC" mode="edit" />
}

function useResourceDraftQuery(kind: ResourceKind, workspaceId: string | undefined, resourceId: string | undefined) {
  const eventQuery = useEventQuery(workspaceId, kind === 'EVENT' ? resourceId : undefined)
  const taskQuery = useTaskQuery(workspaceId, kind === 'TASK' ? resourceId : undefined)
  const projectQuery = useProjectQuery(workspaceId, kind === 'PROJECT' || kind === 'EPIC' ? resourceId : undefined)
  const draft = kind === 'EVENT' && eventQuery.data
    ? draftFromEvent(eventQuery.data)
    : kind === 'TASK' && taskQuery.data
      ? draftFromTask(taskQuery.data)
      : (kind === 'PROJECT' || kind === 'EPIC') && projectQuery.data
        ? draftFromProject(projectQuery.data)
        : undefined
  const members: MemberSummaryResponse[] = kind === 'TASK' ? taskQuery.data?.assignees ?? [] : kind === 'EVENT' ? eventQuery.data?.participants ?? [] : []
  return {
    draft,
    members,
    isPending: eventQuery.isPending || taskQuery.isPending || projectQuery.isPending,
    isError: eventQuery.isError || taskQuery.isError || projectQuery.isError,
  }
}

function ResourceDetail({ kind }: { kind: ResourceKind }) {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const resourceId = useResourceIdParam(kind)
  const { draft, members, isPending, isError } = useResourceDraftQuery(kind, activeWorkspaceId, resourceId)
  const meta = resourceMeta[kind]
  const Icon = meta.icon
  const backTo = backRouteFor(kind, pathname)
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = pathname.startsWith('/collab')
  const resourceType = resourceTypeFor(kind)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to={backTo} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-card">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{draft?.title ?? meta.label}</h1>
              <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? 'Workspace'} · {meta.label} detail</p>
            </div>
          </div>
        </div>
        {canWrite && draft && <EditLink kind={kind} resourceId={resourceId ?? ''} inCollaboratorPortal={inCollaboratorPortal} />}
      </div>

      {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to view this resource.</div>}
      {apiEnabled && isPending && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading resource from backend...</div>}
      {apiEnabled && isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">Unable to load this resource from the API.</div>}
      {apiEnabled && !isPending && !isError && !draft && <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">Resource not found.</div>}

      {draft && (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Panel>
              <PanelHeader>
                <PanelTitle>Overview</PanelTitle>
              </PanelHeader>
              <PanelBody className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={kind === 'TASK' ? 'task' : kind === 'EVENT' ? 'event' : 'project'}>{kind}</Badge>
                  <Badge tone={draft.visibility === 'PUBLIC' ? 'success' : 'muted'}>{draft.visibility}</Badge>
                  <Badge tone="muted">{draft.status}</Badge>
                  {kind === 'TASK' && <Badge tone={draft.priority === 'URGENT' ? 'danger' : 'task'}>{draft.priority}</Badge>}
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <DetailRow label="Workspace" value={activeWorkspace?.name ?? 'Workspace'} />
                  <DetailRow label="Access" value={activeWorkspace?.accessLevel ?? 'READ'} />
                  {(kind === 'EVENT' || kind === 'TASK') && <DetailRow label="Time" value={`${draft.startsAt} - ${draft.endsAt}`} />}
                  {draft.project && <DetailRow label="Project" value={draft.project} />}
                  {draft.epic && <DetailRow label="Epic" value={draft.epic} />}
                </div>
                {(kind === 'TASK' || kind === 'EVENT') && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{kind === 'TASK' ? 'Assignees' : 'Participants'}</div>
                    <div className="flex flex-wrap gap-2">
                      {!members.length && <span className="text-sm text-muted-foreground">None yet</span>}
                      {members.map((member) => (
                        <Badge key={member.id} tone="muted">{member.email}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Description</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <article className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {draft.markdown}
                </article>
              </PanelBody>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel>
              <PanelHeader>
                <PanelTitle>Publication</PanelTitle>
              </PanelHeader>
              <PanelBody className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-md border p-3" style={{ backgroundColor: draft.color.background, color: draft.color.foreground, borderColor: draft.color.border }}>
                  <div className="font-semibold">{draft.color.name}</div>
                  <div className="mt-1 opacity-80">{draft.visibility.toLowerCase()} visibility</div>
                </div>
                <p>Public resources may appear on the visitor calendar. Private resources are masked as busy time.</p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Attachments</PanelTitle>
              </PanelHeader>
              <AttachmentPanel resourceType={resourceType} resourceId={resourceId} canWrite={canWrite} />
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Collaboration</PanelTitle>
              </PanelHeader>
              <CollaborationPanel resourceType={resourceType} resourceId={resourceId} canWrite={canWrite} />
            </Panel>
          </aside>
        </section>
      )}
    </div>
  )
}

function AttachmentPanel({ resourceType, resourceId, canWrite }: { resourceType: ResourceType; resourceId?: string; canWrite: boolean }) {
  const attachmentsQuery = useAttachmentQuery(resourceType, resourceId)
  const mutations = useAttachmentMutations(resourceType, resourceId)

  return (
    <PanelBody className="space-y-3">
      {canWrite && (
        <label className="block rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:border-primary/50">
          <Paperclip className="mb-2 h-4 w-4" aria-hidden />
          <span>{mutations.uploadAttachment.isPending ? 'Uploading attachment...' : 'Upload PDF or image attachment'}</span>
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,image/*"
            disabled={mutations.uploadAttachment.isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) void mutations.uploadAttachment.mutate(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      )}
      {attachmentsQuery.isPending && <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Loading attachments...</div>}
      {attachmentsQuery.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to load attachments.</div>}
      {attachmentsQuery.data?.attachments.length === 0 && <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">No attachments yet.</div>}
      {attachmentsQuery.data?.attachments.map((attachment) => (
        <button
          key={attachment.id}
          className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:border-primary/50"
          onClick={async () => {
            const download = await mutations.createDownloadUrl.mutateAsync(attachment.id)
            globalThis.location.assign(download.url)
          }}
        >
          <span className="min-w-0 truncate">{attachment.originalFilename}</span>
          <Badge tone="muted">{formatBytes(attachment.sizeBytes)}</Badge>
        </button>
      ))}
    </PanelBody>
  )
}

function CollaborationPanel({ resourceType, resourceId, canWrite }: { resourceType: ResourceType; resourceId?: string; canWrite: boolean }) {
  const { proposeCollaboration } = useCollaborationMutations()
  const disabled = !canWrite || !resourceId || proposeCollaboration.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProposeCollaborationFormValues>({
    resolver: zodResolver(proposeCollaborationSchema),
    defaultValues: { email: '', accessLevel: 'READ', message: '' },
  })

  function onSubmit(values: ProposeCollaborationFormValues) {
    if (!resourceId) return
    proposeCollaboration.mutate({ resourceType, resourceId, recipientEmail: values.email, accessLevel: values.accessLevel, message: values.message }, {
      onSuccess: () => reset(),
    })
  }

  return (
    <PanelBody>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <input className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="collaborator@example.com" disabled={disabled} {...register('email')} />
        <FieldError message={errors.email?.message} />
        <div className="grid grid-cols-2 gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" disabled={disabled} {...register('accessLevel')}>
            <option value="READ">Read</option>
            <option value="WRITE">Write</option>
          </select>
          <Button className="h-9" disabled={disabled}>
            {proposeCollaboration.isPending ? 'Sending' : 'Propose'}
          </Button>
        </div>
        <textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Context for the collaborator" disabled={disabled} {...register('message')} />
        {proposeCollaboration.isSuccess && <p className="text-xs text-available">Collaboration proposal sent.</p>}
        {proposeCollaboration.isError && <p className="text-xs text-busy">Unable to propose collaboration.</p>}
      </form>
    </PanelBody>
  )
}

function EditLink({ kind, resourceId, inCollaboratorPortal }: { kind: ResourceKind; resourceId: string; inCollaboratorPortal: boolean }) {
  const className = 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  if (kind === 'TASK') {
    return inCollaboratorPortal ? (
      <Link to="/collab/tasks/$taskId/edit" params={{ taskId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    ) : (
      <Link to="/app/tasks/$taskId/edit" params={{ taskId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    )
  }
  if (kind === 'PROJECT') {
    return inCollaboratorPortal ? (
      <Link to="/collab/projects/$projectId/edit" params={{ projectId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    ) : (
      <Link to="/app/projects/$projectId/edit" params={{ projectId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    )
  }
  if (kind === 'EPIC') {
    return inCollaboratorPortal ? (
      <Link to="/collab/epics/$epicId/edit" params={{ epicId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    ) : (
      <Link to="/app/epics/$epicId/edit" params={{ epicId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
    )
  }
  return inCollaboratorPortal ? (
    <Link to="/collab/events/$eventId/edit" params={{ eventId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
  ) : (
    <Link to="/app/events/$eventId/edit" params={{ eventId: resourceId }} className={className}><Edit3 className="h-4 w-4" aria-hidden />Edit</Link>
  )
}

function navigateToDetail(kind: ResourceKind, pathname: string, resourceId?: string) {
  if (!resourceId) return
  const base = pathname.startsWith('/collab') ? '/collab' : '/app'
  const segment = kind === 'EVENT' ? 'events' : kind === 'TASK' ? 'tasks' : kind === 'EPIC' ? 'epics' : 'projects'
  globalThis.location.assign(`${base}/${segment}/${resourceId}`)
}

function ResourceEditor({ kind, mode }: { kind: ResourceKind; mode: EditorMode }) {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const backTo = backRouteFor(kind, pathname)
  const resourceId = useResourceIdParam(kind)
  const meta = resourceMeta[kind]
  const Icon = meta.icon
  const initialDraft = useMemo(() => createInitialDraft(kind), [kind])
  const [color, setColor] = useState<ItemColor>(initialDraft.color)
  const [markdown, setMarkdown] = useState(initialDraft.markdown)
  const mutations = useResourceMutations(activeWorkspaceId)
  const activeMutation = mutationFor(kind, mode, mutations)
  const {
    register,
    handleSubmit,
    watch,
    reset,
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: toFormValues(initialDraft),
  })
  const status = watch('status')
  const visibility = watch('visibility')

  const editResourceId = mode === 'edit' ? resourceId : undefined
  const { draft: loadedDraft, isPending: isLoadingResource, isError: loadError } = useResourceDraftQuery(kind, activeWorkspaceId, editResourceId)

  useEffect(() => {
    if (!loadedDraft) return
    reset(toFormValues(loadedDraft))
    setColor(loadedDraft.color)
    setMarkdown(loadedDraft.markdown)
  }, [loadedDraft, reset])

  if (mode === 'edit' && !apiEnabled) {
    return (
      <div className="space-y-5">
        <BackLink backTo={backTo} />
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to edit this resource.</div>
      </div>
    )
  }

  if (mode === 'edit' && isLoadingResource) {
    return (
      <div className="space-y-5">
        <BackLink backTo={backTo} />
        <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading resource from backend...</div>
      </div>
    )
  }

  if (mode === 'edit' && (loadError || !loadedDraft)) {
    return (
      <div className="space-y-5">
        <BackLink backTo={backTo} />
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">Unable to load this resource from the API.</div>
      </div>
    )
  }

  async function onSave(values: ResourceFormValues) {
    if (!canWrite || !apiEnabled) {
      return
    }

    if (kind === 'TASK') {
      const payload = toTaskPayload(values, color, markdown)
      let savedId = resourceId
      if (mode === 'create') {
        const saved = await mutations.createTask.mutateAsync(payload)
        savedId = saved.id
      } else if (resourceId) {
        const saved = await mutations.updateTask.mutateAsync({ id: resourceId, payload })
        savedId = saved.id
      }
      navigateToDetail(kind, pathname, savedId)
      return
    }

    if (kind === 'PROJECT' || kind === 'EPIC') {
      const payload = toProjectPayload(values, color, markdown, kind)
      let savedId = resourceId
      if (mode === 'create') {
        const saved = await mutations.createProject.mutateAsync(payload)
        savedId = saved.id
      } else if (resourceId) {
        const saved = await mutations.updateProject.mutateAsync({ id: resourceId, payload })
        savedId = saved.id
      }
      navigateToDetail(kind, pathname, savedId)
      return
    }

    const payload = toEventPayload(values, color, markdown)
    let savedId = resourceId
    if (mode === 'create') {
      const saved = await mutations.createEvent.mutateAsync(payload)
      savedId = saved.id
    } else if (resourceId) {
      const saved = await mutations.updateEvent.mutateAsync({ id: resourceId, payload })
      savedId = saved.id
    }
    navigateToDetail(kind, pathname, savedId)
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSave)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to={backTo} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-card">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{mode === 'create' ? `Create ${meta.label.toLowerCase()}` : `Edit ${loadedDraft?.title ?? initialDraft.title}`}</h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'create' ? 'Prepare the resource before it is saved to your workspace.' : `${meta.label} edition workspace`}
              </p>
            </div>
          </div>
        </div>
        <Button type="submit" disabled={activeMutation.isPending || !canWrite}>
          <Save className="h-4 w-4" aria-hidden />
          {!canWrite ? 'Read only' : activeMutation.isPending ? 'Saving' : mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </div>

      {!canWrite && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This workspace is read-only for your account.
        </div>
      )}

      {!apiEnabled && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          Select a workspace to save this resource.
        </div>
      )}

      {apiEnabled && activeMutation.isSuccess && (
        <div className="rounded-md border border-available/30 bg-available/10 px-4 py-3 text-sm text-foreground">
          Resource saved through Calendary API.
        </div>
      )}

      {apiEnabled && activeMutation.isError && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          Unable to save this resource. Check authentication, workspace id and required fields.
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Main information</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-4 md:grid-cols-2">
              <Field label="Title" className="md:col-span-2">
                <input
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('title')}
                />
              </Field>
              <Field label="Status">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('status')}
                >
                  {statusOptionsFor(kind).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visibility">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register('visibility')}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </Field>
              {(kind === 'EVENT' || kind === 'TASK') && (
                <>
                  <Field label="Starts at">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      type="time"
                      {...register('startsAt')}
                    />
                  </Field>
                  <Field label="Ends at">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      type="time"
                      {...register('endsAt')}
                    />
                  </Field>
                </>
              )}
              {(kind === 'TASK' || kind === 'EPIC') && (
                <Field label="Project">
                  <input
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    {...register('project')}
                  />
                </Field>
              )}
              {kind === 'TASK' && (
                <>
                  <Field label="Epic">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('epic')}
                    />
                  </Field>
                  <Field label="Priority">
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      {...register('priority')}
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assignees (emails, comma separated)" className="md:col-span-2">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="alice@calendary.dev, bob@calendary.dev"
                      {...register('assigneeEmails')}
                    />
                  </Field>
                </>
              )}
              {kind === 'EVENT' && (
                <Field label="Participants (emails, comma separated)" className="md:col-span-2">
                  <input
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="alice@calendary.dev, bob@calendary.dev"
                    {...register('assigneeEmails')}
                  />
                </Field>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Description</PanelTitle>
            </PanelHeader>
            <PanelBody className="p-3">
              <RichMarkdownEditor value={markdown} onChange={setMarkdown} label={`${meta.label} description`} />
            </PanelBody>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Color</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid grid-cols-2 gap-2">
              {itemColors.map((item) => {
                const selected = color.name === item.name
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={cn('rounded-md border px-3 py-2 text-left text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected && 'ring-2 ring-ring')}
                    style={{ backgroundColor: item.background, color: item.foreground, borderColor: item.border }}
                    onClick={() => setColor(item)}
                  >
                    {item.name}
                  </button>
                )
              })}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Publication</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={kind === 'TASK' ? 'task' : kind === 'EVENT' ? 'event' : 'project'}>{kind}</Badge>
                <Badge tone={visibility === 'PUBLIC' ? 'success' : 'muted'}>{visibility}</Badge>
                <Badge tone="muted">{status}</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Public resources can appear on the visitor calendar. Private busy time stays masked behind a generic busy block.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Attachments</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <Paperclip className="mb-2 h-4 w-4" aria-hidden />
                Save this {meta.label.toLowerCase()} first, then attach PDF or image files from its detail page.
              </div>
            </PanelBody>
          </Panel>
        </aside>
      </section>
    </form>
  )
}

function BackLink({ backTo }: { backTo: ReturnType<typeof backRouteFor> }) {
  return (
    <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </Link>
  )
}

function backRouteFor(kind: ResourceKind, pathname: string): '/app/calendar' | '/app/tasks' | '/app/projects' | '/collab/calendar' | '/collab/tasks' | '/collab/projects' {
  const base = pathname.startsWith('/collab') ? '/collab' : '/app'
  if (kind === 'EVENT') return `${base}/calendar` as '/app/calendar' | '/collab/calendar'
  if (kind === 'TASK') return `${base}/tasks` as '/app/tasks' | '/collab/tasks'
  return `${base}/projects` as '/app/projects' | '/collab/projects'
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('space-y-2', className)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 truncate font-medium">{value}</div>
    </div>
  )
}

function createInitialDraft(kind: ResourceKind): ResourceDraft {
  return {
    title: `Untitled ${resourceMeta[kind].label.toLowerCase()}`,
    status: statusOptionsFor(kind)[0],
    visibility: 'PRIVATE',
    startsAt: '09:00',
    endsAt: '10:00',
    project: kind === 'PROJECT' ? '' : 'Calendary MVP',
    epic: '',
    priority: 'MEDIUM',
    color: itemColors[kind === 'EVENT' ? 1 : kind === 'TASK' ? 2 : 0],
    markdown: `# Untitled ${resourceMeta[kind].label.toLowerCase()}

Describe the context, expected outcome, collaborators and useful links.
`,
  }
}

function draftFromEvent(event: EventResponse): ResourceDraft {
  return {
    title: event.title,
    status: event.status,
    visibility: event.visibility,
    startsAt: formatTimeInput(event.startsAt),
    endsAt: formatTimeInput(event.endsAt),
    project: '',
    epic: '',
    priority: 'MEDIUM',
    color: itemColorFromPreset(event.color),
    markdown: event.description,
  }
}

function draftFromTask(task: TaskResponse): ResourceDraft {
  return {
    title: task.title,
    status: task.status,
    visibility: task.visibility,
    startsAt: '09:00',
    endsAt: '10:00',
    project: task.projectId ?? '',
    epic: task.epicId ?? '',
    priority: task.priority,
    color: itemColorFromPreset(task.color),
    markdown: task.description,
  }
}

function draftFromProject(project: ProjectResponse): ResourceDraft {
  return {
    title: project.title,
    status: project.status,
    visibility: project.visibility,
    startsAt: project.startsAt ? formatTimeInput(project.startsAt) : '09:00',
    endsAt: project.dueAt ? formatTimeInput(project.dueAt) : '10:00',
    project: project.parentProjectId ?? '',
    epic: '',
    priority: 'MEDIUM',
    color: itemColorFromPreset(project.color),
    markdown: project.description,
  }
}

function itemColorFromPreset(color: { preset: CalendarColorPreset; background: string; foreground: string; border: string }): ItemColor {
  return {
    name: color.preset[0] + color.preset.slice(1).toLowerCase(),
    background: color.background,
    foreground: color.foreground,
    border: color.border,
  }
}

function resourceTypeFor(kind: ResourceKind): ResourceType {
  return kind === 'EVENT' ? 'EVENT' : kind === 'TASK' ? 'TASK' : 'PROJECT'
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatTimeInput(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

function statusOptionsFor(kind: ResourceKind) {
  if (kind === 'EVENT') return ['TENTATIVE', 'CONFIRMED', 'CANCELLED']
  if (kind === 'TASK') return ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
  return ['BACKLOG', 'ACTIVE', 'PAUSED', 'DONE']
}

function mutationFor(kind: ResourceKind, mode: EditorMode, mutations: ReturnType<typeof useResourceMutations>) {
  if (kind === 'TASK') return mode === 'create' ? mutations.createTask : mutations.updateTask
  if (kind === 'PROJECT' || kind === 'EPIC') return mode === 'create' ? mutations.createProject : mutations.updateProject
  return mode === 'create' ? mutations.createEvent : mutations.updateEvent
}

function toFormValues(draft: ResourceDraft): ResourceFormValues {
  return {
    title: draft.title,
    status: draft.status,
    visibility: draft.visibility,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    project: draft.project,
    epic: draft.epic,
    priority: draft.priority,
    assigneeEmails: '',
  }
}

function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

function toTaskPayload(values: ResourceFormValues, color: ItemColor, markdown: string) {
  return {
    title: values.title,
    description: markdown,
    status: values.status as TaskStatus,
    priority: values.priority as TaskPriority,
    visibility: values.visibility,
    colorPreset: colorPresetFromItem(color, 'GREEN'),
    dueAt: null,
    projectId: null,
    epicId: null,
    parentTaskId: null,
    estimateMinutes: null,
    plannedStart: toInstant(values.startsAt),
    plannedEnd: toInstant(values.endsAt),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    assigneeEmails: parseEmailList(values.assigneeEmails),
  }
}

function toProjectPayload(values: ResourceFormValues, color: ItemColor, markdown: string, kind: ResourceKind) {
  return {
    title: values.title,
    description: markdown,
    type: (kind === 'EPIC' ? 'EPIC' : 'PROJECT') as ProjectType,
    status: values.status as ProjectStatus,
    visibility: values.visibility,
    colorPreset: colorPresetFromItem(color, 'ORANGE'),
    parentProjectId: null,
    startsAt: null,
    dueAt: null,
  }
}

function toEventPayload(values: ResourceFormValues, color: ItemColor, markdown: string) {
  return {
    title: values.title,
    description: markdown,
    startsAt: toInstant(values.startsAt),
    endsAt: toInstant(values.endsAt),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    visibility: values.visibility,
    colorPreset: colorPresetFromItem(color, 'BLUE'),
    status: values.status as EventStatus,
    participantEmails: parseEmailList(values.assigneeEmails),
  }
}

function colorPresetFromItem(color: ItemColor, fallback: CalendarColorPreset): CalendarColorPreset {
  const preset = color.name.toUpperCase()
  return isColorPreset(preset) ? preset : fallback
}

function isColorPreset(value: string): value is CalendarColorPreset {
  return ['ORANGE', 'BLUE', 'GREEN', 'ROSE', 'VIOLET', 'SLATE', 'AMBER'].includes(value)
}

function toInstant(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toISOString()
}
