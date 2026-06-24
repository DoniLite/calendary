import { CalendarRange, ChevronLeft, ChevronRight, ListFilter, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useProjectsQuery, useTasksQuery, type ProjectResponse, type TaskResponse } from '../../lib/api'

const windowDays = 28
const dayWidth = 46

type TimelineRowData = {
  id: string
  label: string
  startOffset: number
  span: number
  title: string
  status: string
  tone: 'project' | 'event' | 'task' | 'danger'
}

export function TimelineView() {
  const { activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const [windowOffset, setWindowOffset] = useState(0)
  const windowStart = useMemo(() => addDays(startOfDay(new Date()), windowOffset * windowDays), [windowOffset])
  const days = useMemo(() => Array.from({ length: windowDays }, (_, index) => addDays(windowStart, index)), [windowStart])
  const todayOffset = dayOffset(new Date(), windowStart)

  const projectsQuery = useProjectsQuery(activeWorkspaceId)
  const tasksQuery = useTasksQuery(activeWorkspaceId)
  const projects = projectsQuery.data?.projects ?? []
  const tasks = tasksQuery.data?.items ?? []
  const openTasks = tasks.filter((task) => task.status !== 'DONE')

  const rows = useMemo(() => buildTimelineRows(projects, openTasks, windowStart), [projects, openTasks, windowStart])
  const nextDueTask = openTasks
    .filter((task) => task.dueAt)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime())[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-muted-foreground">GitHub-style planning across epics, projects and scheduled task blocks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setWindowOffset(0)}>
            <CalendarRange className="h-4 w-4" aria-hidden />
            Today
          </Button>
          <Button variant="secondary" aria-label="Previous period" onClick={() => setWindowOffset((value) => value - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" aria-label="Next period" onClick={() => setWindowOffset((value) => value + 1)}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to load its timeline.</div>}

      {apiEnabled && (
        <Panel className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-card px-3 py-3">
            <Button variant="secondary" className="h-8">
              <ListFilter className="h-4 w-4" aria-hidden />
              Timeline
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <div className="overflow-auto">
            <div className="grid min-w-[1380px]" style={{ gridTemplateColumns: `260px repeat(${windowDays}, ${dayWidth}px)` }}>
              <div className="sticky left-0 z-20 border-b bg-muted px-4 py-3 text-sm font-semibold">
                {formatDayLabel(days[0])} – {formatDayLabel(days[days.length - 1])}
              </div>
              {days.map((day, index) => (
                <div key={index} className="border-b border-l bg-muted px-2 py-3 text-center text-xs text-muted-foreground">
                  {day.getDate()}
                </div>
              ))}

              {rows.map((row, rowIndex) => (
                <TimelineRow key={row.id} row={row} rowIndex={rowIndex} todayOffset={todayOffset} />
              ))}
            </div>
          </div>
          {!rows.length && !projectsQuery.isPending && !tasksQuery.isPending && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No dated projects, epics or tasks in this window.</div>
          )}
        </Panel>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Stat label="Active projects" value={String(projects.filter((project) => project.type === 'PROJECT' && project.status === 'ACTIVE').length)} />
        <Stat label="Open tasks" value={String(openTasks.length)} />
        <Stat label="Next due date" value={nextDueTask?.dueAt ? new Date(nextDueTask.dueAt).toLocaleDateString() : 'None scheduled'} />
      </section>
    </div>
  )
}

function buildTimelineRows(projects: ProjectResponse[], tasks: TaskResponse[], windowStart: Date): TimelineRowData[] {
  const windowEnd = addDays(windowStart, windowDays)
  const rows: TimelineRowData[] = []

  for (const project of projects) {
    if (!project.startsAt || !project.dueAt) continue
    const start = new Date(project.startsAt)
    const end = new Date(project.dueAt)
    if (end < windowStart || start > windowEnd) continue
    const startOffset = Math.max(0, dayOffset(start, windowStart))
    const endOffset = Math.min(windowDays, dayOffset(end, windowStart) + 1)
    rows.push({
      id: project.id,
      label: project.title,
      startOffset,
      span: Math.max(1, endOffset - startOffset),
      title: `${project.type} — ${project.title}`,
      status: project.status,
      tone: project.type === 'EPIC' ? 'event' : 'project',
    })
  }

  for (const task of tasks) {
    if (!task.dueAt) continue
    const due = new Date(task.dueAt)
    const offset = dayOffset(due, windowStart)
    if (offset < 0 || offset >= windowDays) continue
    rows.push({
      id: task.id,
      label: task.title,
      startOffset: offset,
      span: 1,
      title: `TASK — ${task.title}`,
      status: task.priority,
      tone: task.priority === 'URGENT' ? 'danger' : 'task',
    })
  }

  return rows
}

function TimelineRow({ row, rowIndex, todayOffset }: { row: TimelineRowData; rowIndex: number; todayOffset: number }) {
  return (
    <>
      <div className="sticky left-0 z-10 flex h-16 items-center border-b bg-card px-4 text-sm text-muted-foreground">
        {row.label}
      </div>
      {Array.from({ length: windowDays }, (_, day) => (
        <div key={day} className="relative h-16 border-b border-l bg-card">
          {day === todayOffset && <div className="absolute inset-y-0 left-1/2 w-px bg-destructive" />}
          {day === row.startOffset && (
            <div
              className="absolute left-1 top-3 z-10 flex h-10 items-center gap-2 rounded-md border bg-background px-3 shadow-sm"
              style={{ width: row.span * dayWidth - 8 }}
            >
              <span className="text-xs">{rowIndex % 2 === 0 ? '▸' : '◆'}</span>
              <span className="truncate text-sm font-medium">{row.title}</span>
              <Badge tone={row.tone}>{row.status}</Badge>
            </div>
          )}
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

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function addDays(date: Date, days: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function dayOffset(date: Date, windowStart: Date) {
  return Math.floor((startOfDay(date).getTime() - windowStart.getTime()) / 86_400_000)
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(date)
}
