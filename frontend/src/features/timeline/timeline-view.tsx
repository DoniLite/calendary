import { CalendarRange, ChevronLeft, ChevronRight, ListFilter, Search, SlidersHorizontal } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel } from '../../components/ui/panel'
import { projects, tasks } from '../../lib/demo-data'

const timelineDays = Array.from({ length: 24 }, (_, index) => index + 1)
const rows = [
  { id: 'r1', label: 'Organization / Agency', start: 2, span: 8, title: 'EPIC — Organization/Agency', status: 'In Progress', tone: 'project' as const },
  { id: 'r2', label: 'Catalogue & Search', start: 5, span: 9, title: 'EPIC — Catalogue & Search', status: 'Backlog', tone: 'event' as const },
  { id: 'r3', label: 'Resources', start: 20, span: 3, title: 'EPIC — Resources', status: 'Critical', tone: 'danger' as const },
  { id: 'r4', label: 'Booking polish', start: 11, span: 5, title: 'TASK — Booking polish', status: 'High', tone: 'task' as const },
  { id: 'r5', label: 'Frontend shell', start: 7, span: 10, title: 'PROJECT — Frontend shell', status: 'Active', tone: 'project' as const },
]

export function TimelineView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-muted-foreground">GitHub-style planning across epics, projects and scheduled task blocks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">
            <CalendarRange className="h-4 w-4" aria-hidden />
            Month
          </Button>
          <Button variant="secondary">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary">
            Today
          </Button>
          <Button variant="secondary">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-card px-3 py-3">
          <Button variant="secondary" className="h-8">
            <ListFilter className="h-4 w-4" aria-hidden />
            Timeline
          </Button>
          <Button variant="ghost" className="h-8">
            Done
          </Button>
          <Button variant="ghost" className="h-8">
            Upcoming
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        </div>

        <div className="overflow-auto">
          <div className="grid min-w-[1380px]" style={{ gridTemplateColumns: '260px repeat(24, 46px)' }}>
            <div className="sticky left-0 z-20 border-b bg-muted px-4 py-3 text-sm font-semibold">May 2026</div>
            {timelineDays.map((day) => (
              <div key={day} className="border-b border-l bg-muted px-2 py-3 text-center text-xs text-muted-foreground">
                {day}
              </div>
            ))}

            {rows.map((row, rowIndex) => (
              <TimelineRow key={row.id} row={row} rowIndex={rowIndex} />
            ))}
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-3">
        <Stat label="Active projects" value={String(projects.length)} />
        <Stat label="Open tasks" value={String(tasks.filter((task) => task.status !== 'DONE').length)} />
        <Stat label="Critical window" value="May 22" />
      </section>
    </div>
  )
}

function TimelineRow({ row, rowIndex }: { row: (typeof rows)[number]; rowIndex: number }) {
  const today = 22
  return (
    <>
      <div className="sticky left-0 z-10 flex h-16 items-center border-b bg-card px-4 text-sm text-muted-foreground">
        {row.label}
      </div>
      {timelineDays.map((day) => (
        <div key={`${row.id}-${day}`} className="relative h-16 border-b border-l bg-card">
          {day === today && <div className="absolute inset-y-0 left-1/2 w-px bg-destructive" />}
          {day === row.start && (
            <div
              className="absolute left-1 top-3 z-10 flex h-10 items-center gap-2 rounded-md border bg-background px-3 shadow-sm"
              style={{ width: row.span * 46 - 8 }}
            >
              <span className="text-xs">{rowIndex % 2 === 0 ? '▸' : '◆'}</span>
              <span className="truncate text-sm font-medium">{row.title}</span>
              <Badge tone={row.tone}>{row.status}</Badge>
            </div>
          )}
          {day % 7 === 0 && <div className="absolute inset-y-0 left-0 w-full bg-muted/30" />}
        </div>
      ))}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Panel>
  )
}
