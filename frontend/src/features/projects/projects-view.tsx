import { Paperclip, Plus } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { TabBar, TabButton } from '../../components/ui/tabs'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useProjectsQuery, type ProjectResponse, type ProjectType } from '../../lib/api'
import type { ProjectItem } from '../../lib/demo-data'

type ProjectFilter = 'ALL' | ProjectType

export function ProjectsView() {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = useRouterState({ select: (state) => state.location.pathname.startsWith('/collab') })
  const [filter, setFilter] = useState<ProjectFilter>('ALL')
  const projectsQuery = useProjectsQuery(activeWorkspaceId, filter === 'ALL' ? undefined : filter)
  const visibleProjects = projectsQuery.data?.projects.map(toProjectItem) ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Projects and epics loaded from Calendary API.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabBar>
            {([
              { id: 'ALL', label: 'All' },
              { id: 'PROJECT', label: 'Projects' },
              { id: 'EPIC', label: 'Epics' },
            ] as const).map((item) => (
              <TabButton key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </TabButton>
            ))}
          </TabBar>
          {canWrite && (
          inCollaboratorPortal ? (
            <Link to="/collab/projects/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              Project
            </Link>
          ) : (
            <Link to="/app/projects/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              Project
            </Link>
          )
          )}
        </div>
      </div>

      {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to load its projects.</div>}
      {apiEnabled && projectsQuery.isPending && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading projects from backend...</div>}
      {apiEnabled && projectsQuery.isError && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          Unable to load backend projects. Check your session and workspace id.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        {visibleProjects.map((project) => (
          <Panel key={project.id}>
            <PanelHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <PanelTitle>
                  <ProjectLink project={project} inCollaboratorPortal={inCollaboratorPortal} />
                </PanelTitle>
                <Badge tone={project.type === 'EPIC' ? 'event' : 'project'}>{project.type}</Badge>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-project" style={{ width: `${project.progress}%` }} />
              </div>
            </PanelHeader>
            <PanelBody>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Metric label="Progress" value={`${project.progress}%`} />
                <Metric label="Tasks" value={`${project.tasks}`} />
                <Metric label="Due" value={project.dueAt} />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" aria-hidden />
                Markdown notes and B2 attachments
              </div>
            </PanelBody>
          </Panel>
        ))}
      </section>
      {apiEnabled && !visibleProjects.length && !projectsQuery.isPending && (
        <div className="rounded-md border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No projects or epics in this workspace yet.
        </div>
      )}
    </div>
  )
}

function ProjectLink({ project, inCollaboratorPortal }: { project: ProjectItem; inCollaboratorPortal: boolean }) {
  if (project.type === 'EPIC') {
    return inCollaboratorPortal ? (
      <Link to="/collab/epics/$epicId" params={{ epicId: project.id }} className="hover:underline">
        {project.title}
      </Link>
    ) : (
      <Link to="/app/epics/$epicId" params={{ epicId: project.id }} className="hover:underline">
        {project.title}
      </Link>
    )
  }

  return inCollaboratorPortal ? (
    <Link to="/collab/projects/$projectId" params={{ projectId: project.id }} className="hover:underline">
      {project.title}
    </Link>
  ) : (
    <Link to="/app/projects/$projectId" params={{ projectId: project.id }} className="hover:underline">
      {project.title}
    </Link>
  )
}

function toProjectItem(project: ProjectResponse): ProjectItem {
  return {
    id: project.id,
    title: project.title,
    type: project.type,
    status: project.status,
    progress: project.status === 'DONE' ? 100 : project.status === 'ACTIVE' ? 48 : 0,
    dueAt: project.dueAt ? new Date(project.dueAt).toLocaleDateString() : 'No due date',
    tasks: 0,
    color: {
      name: project.color.preset,
      background: project.color.background,
      foreground: project.color.foreground,
      border: project.color.border,
    },
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  )
}
