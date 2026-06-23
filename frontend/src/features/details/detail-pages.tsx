import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, CalendarClock, CheckSquare2, Edit3, Layers3, Paperclip, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
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
  type ProjectResponse,
  type ProjectStatus,
  type ProjectType,
  type ResourceType,
  type TaskPriority,
  type TaskResponse,
  type TaskStatus,
} from '../../lib/api'
import { calendarItems, itemColors, projects, tasks, type ItemColor } from '../../lib/demo-data'
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

function ResourceDetail({ kind }: { kind: ResourceKind }) {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const resourceId = pathname.split('/').at(-1)
  const eventQuery = useEventQuery(activeWorkspaceId, kind === 'EVENT' ? resourceId : undefined)
  const taskQuery = useTaskQuery(activeWorkspaceId, kind === 'TASK' ? resourceId : undefined)
  const projectQuery = useProjectQuery(activeWorkspaceId, kind === 'PROJECT' || kind === 'EPIC' ? resourceId : undefined)
  const apiDraft = kind === 'EVENT' && eventQuery.data
    ? draftFromEvent(eventQuery.data)
    : kind === 'TASK' && taskQuery.data
      ? draftFromTask(taskQuery.data)
      : (kind === 'PROJECT' || kind === 'EPIC') && projectQuery.data
        ? draftFromProject(projectQuery.data)
        : undefined
  const draft = apiEnabled ? apiDraft ?? createInitialDraft(kind, 'edit', resourceId) : createInitialDraft(kind, 'edit', resourceId)
  const meta = resourceMeta[kind]
  const Icon = meta.icon
  const backTo = backRouteFor(kind, pathname)
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = pathname.startsWith('/collab')
  const isLoading = apiEnabled && (eventQuery.isPending || taskQuery.isPending || projectQuery.isPending)
  const isError = apiEnabled && (eventQuery.isError || taskQuery.isError || projectQuery.isError)
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
              <h1 className="truncate text-2xl font-semibold">{draft.title}</h1>
              <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? 'Workspace'} · {meta.label} detail</p>
            </div>
          </div>
        </div>
        {canWrite && <EditLink kind={kind} resourceId={resourceId ?? ''} inCollaboratorPortal={inCollaboratorPortal} />}
      </div>

      {isLoading && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading resource from backend...</div>}
      {isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">Unable to load this resource from the API.</div>}

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
                <DetailRow label="Workspace" value={activeWorkspace?.name ?? 'Demo workspace'} />
                <DetailRow label="Access" value={activeWorkspace?.accessLevel ?? 'Demo'} />
                {(kind === 'EVENT' || kind === 'TASK') && <DetailRow label="Time" value={`${draft.startsAt} - ${draft.endsAt}`} />}
                {draft.project && <DetailRow label="Project" value={draft.project} />}
                {draft.epic && <DetailRow label="Epic" value={draft.epic} />}
              </div>
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
            <AttachmentPanel resourceType={resourceType} resourceId={resourceId} canWrite={canWrite} apiEnabled={apiEnabled} />
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Collaboration</PanelTitle>
            </PanelHeader>
            <CollaborationPanel resourceType={resourceType} resourceId={resourceId} canWrite={canWrite} apiEnabled={apiEnabled} />
          </Panel>
        </aside>
      </section>
    </div>
  )
}

function AttachmentPanel({ resourceType, resourceId, canWrite, apiEnabled }: { resourceType: ResourceType; resourceId?: string; canWrite: boolean; apiEnabled: boolean }) {
  const attachmentsQuery = useAttachmentQuery(resourceType, resourceId, apiEnabled)
  const mutations = useAttachmentMutations(resourceType, resourceId)

  if (!apiEnabled) {
    return (
      <PanelBody className="space-y-3">
        {['brief.pdf', 'screenshot.png'].map((file) => (
          <div key={file} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="truncate">{file}</span>
            <Badge tone="muted">Demo</Badge>
          </div>
        ))}
      </PanelBody>
    )
  }

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

function CollaborationPanel({ resourceType, resourceId, canWrite, apiEnabled }: { resourceType: ResourceType; resourceId?: string; canWrite: boolean; apiEnabled: boolean }) {
  const [email, setEmail] = useState('')
  const [accessLevel, setAccessLevel] = useState<'READ' | 'WRITE'>('READ')
  const [message, setMessage] = useState('')
  const { proposeCollaboration } = useCollaborationMutations()
  const disabled = !apiEnabled || !canWrite || !resourceId || proposeCollaboration.isPending

  return (
    <PanelBody>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault()
        if (!resourceId) return
        proposeCollaboration.mutate({ resourceType, resourceId, recipientEmail: email, accessLevel, message }, {
          onSuccess: () => {
            setEmail('')
            setMessage('')
          },
        })
      }}>
        <input className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" required disabled={disabled} />
        <div className="grid grid-cols-2 gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as 'READ' | 'WRITE')} disabled={disabled}>
            <option value="READ">Read</option>
            <option value="WRITE">Write</option>
          </select>
          <Button className="h-9" disabled={disabled}>
            {proposeCollaboration.isPending ? 'Sending' : 'Propose'}
          </Button>
        </div>
        <textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Context for the collaborator" disabled={disabled} />
        {!apiEnabled && <p className="text-xs text-muted-foreground">Sign in and select a workspace to propose collaboration.</p>}
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
  const resourceId = pathname.split('/').at(-2)
  const meta = resourceMeta[kind]
  const Icon = meta.icon
  const initialDraft = useMemo(() => createInitialDraft(kind, mode, resourceId), [kind, mode, resourceId])
  const [draft, setDraft] = useState<ResourceDraft>(initialDraft)
  const [localSaved, setLocalSaved] = useState(false)
  const mutations = useResourceMutations(activeWorkspaceId)
  const activeMutation = mutationFor(kind, mode, mutations)

  function updateDraft<Key extends keyof ResourceDraft>(key: Key, value: ResourceDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setLocalSaved(false)
  }

  async function handleSave() {
    if (!canWrite) {
      return
    }

    if (!apiEnabled) {
      setLocalSaved(true)
      return
    }

    if (kind === 'TASK') {
      const payload = toTaskPayload(draft)
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
      const payload = toProjectPayload(draft, kind)
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

    const payload = toEventPayload(draft)
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
              <h1 className="truncate text-2xl font-semibold">{mode === 'create' ? `Create ${meta.label.toLowerCase()}` : `Edit ${draft.title}`}</h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'create' ? 'Prepare the resource before it is saved to your workspace.' : `${meta.label} edition workspace`}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => void handleSave()} disabled={activeMutation.isPending || !canWrite}>
          <Save className="h-4 w-4" aria-hidden />
          {!canWrite ? 'Read only' : activeMutation.isPending ? 'Saving' : mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </div>

      {!canWrite && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This workspace is read-only for your account.
        </div>
      )}

      {!apiEnabled && localSaved && (
        <div className="rounded-md border border-available/30 bg-available/10 px-4 py-3 text-sm text-foreground">
          Draft saved locally for this mock session. Sign in and select a workspace to persist through the backend.
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
                  value={draft.title}
                  onChange={(event) => updateDraft('title', event.target.value)}
                />
              </Field>
              <Field label="Status">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.status}
                  onChange={(event) => updateDraft('status', event.target.value)}
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
                  value={draft.visibility}
                  onChange={(event) => updateDraft('visibility', event.target.value as ResourceDraft['visibility'])}
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
                      value={draft.startsAt}
                      onChange={(event) => updateDraft('startsAt', event.target.value)}
                    />
                  </Field>
                  <Field label="Ends at">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      type="time"
                      value={draft.endsAt}
                      onChange={(event) => updateDraft('endsAt', event.target.value)}
                    />
                  </Field>
                </>
              )}
              {(kind === 'TASK' || kind === 'EPIC') && (
                <Field label="Project">
                  <input
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={draft.project}
                    onChange={(event) => updateDraft('project', event.target.value)}
                  />
                </Field>
              )}
              {kind === 'TASK' && (
                <>
                  <Field label="Epic">
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      value={draft.epic}
                      onChange={(event) => updateDraft('epic', event.target.value)}
                    />
                  </Field>
                  <Field label="Priority">
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      value={draft.priority}
                      onChange={(event) => updateDraft('priority', event.target.value)}
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Description</PanelTitle>
            </PanelHeader>
            <PanelBody className="p-3">
              <RichMarkdownEditor value={draft.markdown} onChange={(value) => updateDraft('markdown', value)} label={`${meta.label} description`} />
            </PanelBody>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Color</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid grid-cols-2 gap-2">
              {itemColors.map((color) => {
                const selected = draft.color.name === color.name
                return (
                  <button
                    key={color.name}
                    className={cn('rounded-md border px-3 py-2 text-left text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected && 'ring-2 ring-ring')}
                    style={{ backgroundColor: color.background, color: color.foreground, borderColor: color.border }}
                    onClick={() => updateDraft('color', color)}
                  >
                    {color.name}
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
                <Badge tone={draft.visibility === 'PUBLIC' ? 'success' : 'muted'}>{draft.visibility}</Badge>
                <Badge tone="muted">{draft.status}</Badge>
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
                Drop PDF or image attachments here. Files will be stored in B2.
              </div>
              {['brief.pdf', 'screenshot.png'].map((file) => (
                <div key={file} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="truncate">{file}</span>
                  <Badge tone="muted">B2</Badge>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </aside>
      </section>
    </div>
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

function createInitialDraft(kind: ResourceKind, mode: EditorMode, resourceId?: string): ResourceDraft {
  if (mode === 'edit') {
    const existing = findExistingResource(kind, resourceId)
    if (existing) return existing
  }

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

function findExistingResource(kind: ResourceKind, resourceId?: string): ResourceDraft | undefined {
  if (kind === 'TASK') {
    const task = tasks.find((item) => item.id === resourceId)
    if (!task) return undefined
    return {
      title: task.title,
      status: task.status,
      visibility: 'PRIVATE',
      startsAt: '09:00',
      endsAt: '10:00',
      project: task.project,
      epic: task.epic,
      priority: task.priority,
      color: task.color,
      markdown: `# ${task.title}

Project: ${task.project}

Epic: ${task.epic}
`,
    }
  }

  if (kind === 'PROJECT' || kind === 'EPIC') {
    const project = projects.find((item) => item.id === resourceId)
    if (!project) return undefined
    return {
      title: project.title,
      status: project.status,
      visibility: 'PRIVATE',
      startsAt: '09:00',
      endsAt: '10:00',
      project: kind === 'EPIC' ? 'Calendary MVP' : '',
      epic: '',
      priority: 'MEDIUM',
      color: project.color,
      markdown: `# ${project.title}

Progress: ${project.progress}%

Tasks: ${project.tasks}
`,
    }
  }

  const event = calendarItems.find((item) => item.id === resourceId)
  if (!event) return undefined
  return {
    title: event.title,
    status: event.status,
    visibility: event.visibility,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    project: event.project ?? '',
    epic: event.epic ?? '',
    priority: 'MEDIUM',
    color: event.color,
    markdown: `# ${event.title}

${event.description}

Participants: ${event.participants.join(', ') || 'none'}
`,
  }
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

function toTaskPayload(draft: ResourceDraft) {
  return {
    title: draft.title,
    description: draft.markdown,
    status: draft.status as TaskStatus,
    priority: draft.priority as TaskPriority,
    visibility: draft.visibility as CalendarVisibility,
    colorPreset: colorPresetFromItem(draft.color, 'GREEN'),
    dueAt: null,
    projectId: null,
    epicId: null,
    parentTaskId: null,
    estimateMinutes: null,
    plannedStart: toInstant(draft.startsAt),
    plannedEnd: toInstant(draft.endsAt),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }
}

function toProjectPayload(draft: ResourceDraft, kind: ResourceKind) {
  return {
    title: draft.title,
    description: draft.markdown,
    type: (kind === 'EPIC' ? 'EPIC' : 'PROJECT') as ProjectType,
    status: draft.status as ProjectStatus,
    visibility: draft.visibility as CalendarVisibility,
    colorPreset: colorPresetFromItem(draft.color, 'ORANGE'),
    parentProjectId: null,
    startsAt: null,
    dueAt: null,
  }
}

function toEventPayload(draft: ResourceDraft) {
  return {
    title: draft.title,
    description: draft.markdown,
    startsAt: toInstant(draft.startsAt),
    endsAt: toInstant(draft.endsAt),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    visibility: draft.visibility as CalendarVisibility,
    colorPreset: colorPresetFromItem(draft.color, 'BLUE'),
    status: draft.status as EventStatus,
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
