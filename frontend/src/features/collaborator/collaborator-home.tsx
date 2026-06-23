import { Check, Clock, Send } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useCollaborationInboxQuery, useCollaborationSentQuery, useNotificationsQuery } from '../../lib/api'
import { projects, tasks } from '../../lib/demo-data'

export function CollaboratorHome() {
  const { apiEnabled, activeWorkspace } = useWorkspaceSession()
  const collaborationInboxQuery = useCollaborationInboxQuery(apiEnabled)
  const collaborationSentQuery = useCollaborationSentQuery(apiEnabled)
  const notificationsQuery = useNotificationsQuery(apiEnabled)
  const sharedTasks = tasks.filter((task) => task.status !== 'DONE')
  const pendingCollaborations = collaborationInboxQuery.data?.collaborations.filter((item) => item.status === 'PENDING').length ?? 2
  const sentCollaborations = collaborationSentQuery.data?.collaborations.length ?? 1

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Collaborator home</h1>
        <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? 'Workspace'} · private resources and shared admin resources.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard title="Shared tasks" value={String(sharedTasks.length)} caption="Visible from Doni workspace" />
        <SummaryCard title="Pending confirmations" value={String(pendingCollaborations)} caption="Collaboration requests" />
        <SummaryCard title="Unread notifications" value={String(notificationsQuery.data?.unreadCount ?? 0)} caption={`${sentCollaborations} sent request${sentCollaborations === 1 ? '' : 's'}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Shared task feed</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {sharedTasks.map((task) => (
              <article key={task.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{task.project} / {task.epic}</div>
                  </div>
                  <Badge tone={task.priority === 'URGENT' ? 'danger' : 'task'}>{task.priority}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="muted">{task.status}</Badge>
                  <Badge tone="muted">{task.estimateMinutes}m</Badge>
                  <Badge tone="project">{task.dueAt}</Badge>
                </div>
              </article>
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Collaboration requests</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {['Doni wants WRITE access on Attachment QA', 'You proposed Scheduling review'].map((label, index) => (
              <article key={label} className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  {index === 0 ? <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <Send className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{index === 0 ? 'Needs your confirmation' : 'Waiting for Doni'}</div>
                    {index === 0 && (
                      <div className="mt-3 flex gap-2">
                        <Button className="h-8 flex-1">
                          <Check className="h-4 w-4" aria-hidden />
                          Accept
                        </Button>
                        <Button variant="secondary" className="h-8 flex-1">Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </PanelBody>
        </Panel>
      </section>

      <Panel>
        <PanelHeader>
          <PanelTitle>Shared projects</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-3 md:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{project.title}</div>
                <Badge tone={project.type === 'EPIC' ? 'event' : 'project'}>{project.type}</Badge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
          ))}
        </PanelBody>
      </Panel>
    </div>
  )
}

function SummaryCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <Panel className="p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{caption}</div>
    </Panel>
  )
}
