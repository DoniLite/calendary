import { Badge } from '../../components/ui/badge'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import {
  useCollaborationInboxQuery,
  useCollaborationSentQuery,
  useInboxMutations,
  useNotificationsQuery,
  useSharedProjectQueries,
  useSharedTaskQueries,
} from '../../lib/api'
import { CollaborationPanel, EmptyState } from '../inbox/inbox-view'

export function CollaboratorHome() {
  const { apiEnabled, activeWorkspace, activeWorkspaceId } = useWorkspaceSession()
  const collaborationInboxQuery = useCollaborationInboxQuery(apiEnabled)
  const collaborationSentQuery = useCollaborationSentQuery(apiEnabled)
  const notificationsQuery = useNotificationsQuery(apiEnabled)
  const mutations = useInboxMutations(activeWorkspaceId)

  const inbox = collaborationInboxQuery.data?.collaborations ?? []
  const sent = collaborationSentQuery.data?.collaborations ?? []
  const acceptedShares = [...inbox, ...sent].filter((item) => item.status === 'ACCEPTED')

  const sharedTaskQueries = useSharedTaskQueries(acceptedShares)
  const sharedProjectQueries = useSharedProjectQueries(acceptedShares)
  const sharedTasks = sharedTaskQueries.map((query) => query.data).filter((task) => task !== undefined)
  const sharedProjects = sharedProjectQueries.map((query) => query.data).filter((project) => project !== undefined)
  const isLoadingSharedResources = sharedTaskQueries.some((query) => query.isPending) || sharedProjectQueries.some((query) => query.isPending)

  const pendingCollaborations = inbox.filter((item) => item.status === 'PENDING').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Collaborator home</h1>
        <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? 'Workspace'} · private resources and shared admin resources.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard title="Shared resources" value={String(sharedTasks.length + sharedProjects.length)} caption="Accepted task/project shares" />
        <SummaryCard title="Pending confirmations" value={String(pendingCollaborations)} caption="Collaboration requests" />
        <SummaryCard title="Unread notifications" value={String(notificationsQuery.data?.unreadCount ?? 0)} caption={`${sent.length} sent request${sent.length === 1 ? '' : 's'}`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Shared task feed</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {isLoadingSharedResources && <EmptyState label="Loading shared tasks..." />}
            {!isLoadingSharedResources && !sharedTasks.length && <EmptyState label="No shared tasks yet." />}
            {sharedTasks.map((task) => (
              <article key={task.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{task.projectId ?? 'No project'} / {task.epicId ?? 'No epic'}</div>
                  </div>
                  <Badge tone={task.priority === 'URGENT' ? 'danger' : 'task'}>{task.priority}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="muted">{task.status}</Badge>
                  <Badge tone="project">{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No due date'}</Badge>
                </div>
              </article>
            ))}
          </PanelBody>
        </Panel>

        <CollaborationPanel title="Collaboration requests" items={inbox} direction="inbox" mutations={mutations} />
      </section>

      <Panel>
        <PanelHeader>
          <PanelTitle>Shared projects</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-3 md:grid-cols-3">
          {!isLoadingSharedResources && !sharedProjects.length && <EmptyState label="No shared projects yet." />}
          {sharedProjects.map((project) => (
            <div key={project.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{project.title}</div>
                <Badge tone={project.type === 'EPIC' ? 'event' : 'project'}>{project.type}</Badge>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">{project.status}</div>
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
