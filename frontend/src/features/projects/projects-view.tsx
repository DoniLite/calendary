import { Paperclip, Plus } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { projects } from '../../lib/demo-data'

export function ProjectsView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Projects, epics, progress and attachment-ready detail pages.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" aria-hidden />
          Project
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {projects.map((project) => (
          <Panel key={project.id}>
            <PanelHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <PanelTitle>{project.title}</PanelTitle>
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
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  )
}
