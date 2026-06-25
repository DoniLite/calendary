import { CalendarClock, ChevronLeft, ChevronRight, Globe2, Lock, Paperclip, Users } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { TabBar, TabButton } from '../../components/ui/tabs'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useCalendarQuery, type CalendarItemResponse } from '../../lib/api'
import { itemColors, type CalendarItem } from '../../lib/demo-data'
import { addCalendarDaysInTimezone, datePartsInTimezone, formatTimeInTimezone, startOfWeekInTimezone } from '../../lib/timezone'
import { cn } from '../../lib/utils'

const hours = Array.from({ length: 18 }, (_, index) => 7 + index)
const hourHeight = 88
const dayWidth = 190
const baseTimezones = ['Europe/Paris', 'UTC', 'America/New_York', 'Africa/Abidjan', 'Asia/Tokyo']
type CalendarMode = 'week' | 'day' | 'agenda'

type CalendarSegment = {
  item: CalendarItem
  dayIndex: number
  startMinutes: number
  endMinutes: number
  continuesBefore: boolean
  continuesAfter: boolean
}

export function CalendarView() {
  const { activeWorkspace, activeWorkspaceId, apiEnabled, user } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = useRouterState({ select: (state) => state.location.pathname.startsWith('/collab') })
  // Defaults to the workspace's own timezone (set in Settings) instead of a hardcoded one, and
  // re-syncs if the workspace's timezone changes — not just on first mount.
  const [timezone, setTimezone] = useState(activeWorkspace?.defaultTimezone ?? 'UTC')
  useEffect(() => {
    if (activeWorkspace?.defaultTimezone) setTimezone(activeWorkspace.defaultTimezone)
  }, [activeWorkspace?.defaultTimezone])
  const timezones = useMemo(
    () => (activeWorkspace?.defaultTimezone && !baseTimezones.includes(activeWorkspace.defaultTimezone)
      ? [activeWorkspace.defaultTimezone, ...baseTimezones]
      : baseTimezones),
    [activeWorkspace?.defaultTimezone],
  )
  const [mode, setMode] = useState<CalendarMode>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeekInTimezone(new Date(), timezone))
  // Re-anchors to "this week" whenever the display timezone changes, since a Date instant
  // computed as "midnight Monday" under one timezone is a different calendar day under another.
  useEffect(() => {
    setWeekStart(startOfWeekInTimezone(new Date(), timezone))
  }, [timezone])
  const weekEnd = useMemo(() => addCalendarDaysInTimezone(weekStart, 7, timezone), [weekStart, timezone])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addCalendarDaysInTimezone(weekStart, index, timezone)),
    [weekStart, timezone],
  )
  const visibleDays = mode === 'day' ? [{ date: days[0], dayIndex: 0 }] : days.map((date, dayIndex) => ({ date, dayIndex }))
  const calendarQuery = useCalendarQuery(activeWorkspaceId, weekStart, weekEnd)
  const { items: calendarData, segments } = useMemo(
    () => buildCalendarItemsAndSegments(calendarQuery.data?.items ?? [], days, timezone, activeWorkspace?.name, user?.email),
    [calendarQuery.data, days, timezone, activeWorkspace?.name, user?.email],
  )
  const [selectedId, setSelectedId] = useState(calendarData[0]?.id)
  const selected = calendarData.find((item) => item.id === selectedId) ?? calendarData[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">{activeWorkspace?.name ?? 'Workspace'} planning loaded from Calendary API.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabBar>
            {(['week', 'day', 'agenda'] as const).map((item) => (
              <TabButton key={item} active={mode === item} onClick={() => setMode(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </TabButton>
            ))}
          </TabBar>
          <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
            <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <select className="bg-transparent outline-none" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezones.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" aria-label="Previous period" onClick={() => setWeekStart((current) => addCalendarDaysInTimezone(current, mode === 'day' ? -1 : -7, timezone))}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" aria-label="Next period" onClick={() => setWeekStart((current) => addCalendarDaysInTimezone(current, mode === 'day' ? 1 : 7, timezone))}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          {canWrite && (
            inCollaboratorPortal ? (
              <Link to="/collab/events/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CalendarClock className="h-4 w-4" aria-hidden />
                Event
              </Link>
            ) : (
              <Link to="/app/events/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CalendarClock className="h-4 w-4" aria-hidden />
                Event
              </Link>
            )
          )}
        </div>
      </div>

      {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to load its calendar.</div>}
      {apiEnabled && calendarQuery.isPending && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading calendar from backend...</div>}
      {apiEnabled && calendarQuery.isError && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          Unable to load backend calendar. Check your session and workspace access.
        </div>
      )}
      {apiEnabled && !calendarData.length && !calendarQuery.isPending && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No calendar blocks in this period.
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel className="overflow-hidden">
          <div className="border-b bg-muted px-4 py-3 text-sm text-muted-foreground">
            Display timezone: <span className="font-medium text-foreground">{timezone}</span> · {mode === 'day' ? formatDayLabel(days[0], timezone) : `${formatDayLabel(days[0], timezone)} - ${formatDayLabel(days[6], timezone)}`}
          </div>
          {mode === 'agenda' ? (
            <AgendaList items={calendarData} onSelect={setSelectedId} />
          ) : (
            <div className="max-h-[720px] overflow-auto">
              <div className="grid min-w-[1304px]" style={{ gridTemplateColumns: `80px repeat(${visibleDays.length}, ${dayWidth}px)` }}>
                <div className="sticky left-0 top-0 z-20 border-b bg-muted px-3 py-3 text-xs font-medium text-muted-foreground">Time</div>
                {visibleDays.map((day) => (
                  <div key={day.date.toISOString()} className="sticky top-0 z-10 border-b border-l bg-muted px-3 py-3 text-sm font-semibold">
                    {formatDayLabel(day.date, timezone)}
                  </div>
                ))}
                <div className="sticky left-0 z-10 bg-card">
                  {hours.map((hour) => (
                    <div key={hour} className="border-b px-3 py-2 text-xs text-muted-foreground" style={{ height: hourHeight }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                {visibleDays.map((day) => (
                  <DayColumn key={day.date.toISOString()} segments={segments} dayIndex={day.dayIndex} selectedId={selected?.id} onSelect={setSelectedId} />
                ))}
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Entry details</PanelTitle>
            </PanelHeader>
            {selected && <CalendarDetails item={selected} inCollaboratorPortal={inCollaboratorPortal} />}
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Color presets</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid grid-cols-2 gap-2">
              {itemColors.map((color) => (
                <div
                  key={color.name}
                  className="rounded-md border px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: color.background, color: color.foreground, borderColor: color.border }}
                >
                  {color.name}
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>
      </section>
    </div>
  )
}

function AgendaList({ items, onSelect }: { items: CalendarItem[]; onSelect: (id: string) => void }) {
  const sortedItems = [...items].sort((a, b) => (a.startsAtInstant ?? '').localeCompare(b.startsAtInstant ?? ''))
  return (
    <div className="max-h-[720px] overflow-auto p-4">
      <div className="space-y-3">
        {!sortedItems.length && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">No calendar blocks in this period.</div>}
        {sortedItems.map((item) => (
          <button key={item.id} className="block w-full rounded-md border bg-background p-3 text-left hover:border-primary/50" onClick={() => onSelect(item.id)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.startsAt} - {item.endsAt}</div>
              </div>
              <Badge tone={item.kind === 'TASK' ? 'task' : item.kind === 'PROJECT' ? 'project' : 'event'}>{item.kind}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={item.busy ? 'danger' : 'success'}>{item.busy ? 'busy' : 'free'}</Badge>
              <Badge tone="muted">{item.visibility}</Badge>
              <Badge tone="muted">{item.workspace}</Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DayColumn({ segments: allSegments, dayIndex, selectedId, onSelect }: { segments: CalendarSegment[]; dayIndex: number; selectedId?: string; onSelect: (id: string) => void }) {
  const segments = useMemo(() => layoutSegments(allSegments.filter((segment) => segment.dayIndex === dayIndex)), [allSegments, dayIndex])
  return (
    <div className="relative border-l bg-card" style={{ height: hours.length * hourHeight }}>
      {hours.map((hour) => (
        <div key={hour} className="border-b" style={{ height: hourHeight }} />
      ))}
      {segments.map(({ segment, column, columns }) => {
        const item = segment.item
        const top = ((segment.startMinutes - hours[0] * 60) / 60) * hourHeight
        const height = Math.max(42, ((segment.endMinutes - segment.startMinutes) / 60) * hourHeight - 6)
        const width = (dayWidth - 18) / columns
        const left = 8 + column * width
        const compact = height < 76 || width < 92
        return (
          <button
            key={`${item.id}-${dayIndex}`}
            className={cn(
              'absolute overflow-hidden border p-2 text-left text-xs shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              segment.continuesBefore ? 'rounded-t-none' : 'rounded-t-md',
              segment.continuesAfter ? 'rounded-b-none' : 'rounded-b-md',
            )}
            style={{
              top,
              left,
              width: width - 6,
              height,
              backgroundColor: item.color.background,
              color: item.color.foreground,
              borderColor: selectedId === item.id ? item.color.foreground : item.color.border,
            }}
            onClick={() => onSelect(item.id)}
          >
            <div className="min-w-0 truncate font-semibold leading-4">
              {item.title}
              {(segment.continuesBefore || segment.continuesAfter) && <span className="ml-1 opacity-70">⋯</span>}
            </div>
            <div className="mt-1 min-w-0 truncate leading-4 opacity-80">
              {formatMinutesLabel(segment.startMinutes)} - {formatMinutesLabel(segment.endMinutes)}
            </div>
            <div className={compact ? 'mt-1 flex min-w-0 gap-1' : 'mt-2 flex min-w-0 flex-wrap gap-1'}>
              <span className="min-w-0 max-w-full truncate rounded-sm bg-white/55 px-1.5 py-0.5 leading-4">{item.kind}</span>
              {!compact && <span className="min-w-0 max-w-full truncate rounded-sm bg-white/55 px-1.5 py-0.5 leading-4">{item.status}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CalendarDetails({ item, inCollaboratorPortal }: { item: CalendarItem; inCollaboratorPortal: boolean }) {
  return (
    <PanelBody className="space-y-4">
      <div className="rounded-md border p-3" style={{ backgroundColor: item.color.background, color: item.color.foreground, borderColor: item.color.border }}>
        <div className="text-base font-semibold">{item.title}</div>
        <div className="mt-1 text-sm opacity-80">
          {item.startsAt} - {item.endsAt}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={item.kind === 'TASK' ? 'task' : item.kind === 'PROJECT' ? 'project' : 'event'}>{item.kind}</Badge>
        <Badge tone={item.busy ? 'danger' : 'success'}>{item.busy ? 'busy' : 'free'}</Badge>
        <Badge tone="muted">{item.status}</Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
      <div className="grid gap-3 text-sm">
        <Detail label="Workspace" value={item.workspace} />
        <Detail label="Owner" value={item.owner} />
        {item.project && <Detail label="Project" value={item.project} />}
        {item.epic && <Detail label="Epic" value={item.epic} />}
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {item.visibility === 'PUBLIC' ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {item.publicLabel ?? item.visibility.toLowerCase()}
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className="h-4 w-4" />
          {item.participants.length || 0}
        </span>
        <span className="inline-flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {item.attachments}
        </span>
      </div>
      <CalendarItemLink item={item} inCollaboratorPortal={inCollaboratorPortal} />
    </PanelBody>
  )
}

function CalendarItemLink({ item, inCollaboratorPortal }: { item: CalendarItem; inCollaboratorPortal: boolean }) {
  const resourceId = item.sourceId ?? item.id
  if (item.kind === 'TASK') {
    return inCollaboratorPortal ? (
      <Link to="/collab/tasks/$taskId" params={{ taskId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
    ) : (
      <Link to="/app/tasks/$taskId" params={{ taskId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
    )
  }

  if (item.kind === 'PROJECT') {
    return inCollaboratorPortal ? (
      <Link to="/collab/projects/$projectId" params={{ projectId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
    ) : (
      <Link to="/app/projects/$projectId" params={{ projectId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
    )
  }

  return inCollaboratorPortal ? (
    <Link to="/collab/events/$eventId" params={{ eventId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
  ) : (
    <Link to="/app/events/$eventId" params={{ eventId: resourceId }} className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Browse details</Link>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

// One CalendarItemResponse becomes one logical CalendarItem (for the Agenda list / detail panel)
// plus one segment per visible day it touches (for the hourly grid) — an item spanning several
// days renders as one clipped block per day instead of being squashed into a single day with a
// time window that ignores the days it actually continues through.
function buildCalendarItemsAndSegments(
  responses: CalendarItemResponse[],
  days: Date[],
  timezone: string,
  workspaceName?: string,
  owner?: string,
): { items: CalendarItem[]; segments: CalendarSegment[] } {
  const items: CalendarItem[] = []
  const segments: CalendarSegment[] = []
  for (const response of responses) {
    const startInstant = new Date(response.startsAt)
    const endInstant = new Date(response.endsAt)
    const itemSegments = buildSegments(startInstant, endInstant, days, timezone)
    if (!itemSegments.length) continue
    const item = toCalendarItem(response, startInstant, endInstant, itemSegments[0].dayIndex, timezone, workspaceName, owner)
    items.push(item)
    for (const segment of itemSegments) segments.push({ ...segment, item })
  }
  return { items, segments }
}

function buildSegments(startInstant: Date, endInstant: Date, days: Date[], timezone: string): Omit<CalendarSegment, 'item'>[] {
  const result: Omit<CalendarSegment, 'item'>[] = []
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const dayStart = days[dayIndex]
    const dayEnd = addCalendarDaysInTimezone(dayStart, 1, timezone)
    const segmentStart = startInstant.getTime() > dayStart.getTime() ? startInstant : dayStart
    const segmentEnd = endInstant.getTime() < dayEnd.getTime() ? endInstant : dayEnd
    if (segmentStart.getTime() >= segmentEnd.getTime()) continue
    result.push({
      dayIndex,
      startMinutes: (segmentStart.getTime() - dayStart.getTime()) / 60_000,
      endMinutes: (segmentEnd.getTime() - dayStart.getTime()) / 60_000,
      continuesBefore: startInstant.getTime() < dayStart.getTime(),
      continuesAfter: endInstant.getTime() > dayEnd.getTime(),
    })
  }
  return result
}

function layoutSegments(segments: CalendarSegment[]) {
  return segments.map((segment) => {
    const overlapping = segments.filter((candidate) => candidate.startMinutes < segment.endMinutes && candidate.endMinutes > segment.startMinutes)
    return {
      segment,
      column: overlapping.findIndex((candidate) => candidate.item.id === segment.item.id),
      columns: Math.max(1, overlapping.length),
    }
  })
}

function formatMinutesLabel(minutes: number) {
  const clamped = Math.max(0, Math.min(1440, Math.round(minutes)))
  if (clamped === 1440) return '24:00'
  const hour = Math.floor(clamped / 60)
  const minute = clamped % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toCalendarItem(
  item: CalendarItemResponse,
  startInstant: Date,
  endInstant: Date,
  dayIndex: number,
  timezone: string,
  workspaceName = 'Workspace',
  owner = 'Calendary',
): CalendarItem {
  const startParts = datePartsInTimezone(startInstant, timezone)
  const endParts = datePartsInTimezone(endInstant, timezone)
  const spansMultipleDays = startParts.year !== endParts.year || startParts.month !== endParts.month || startParts.day !== endParts.day
  return {
    id: item.id,
    sourceId: item.sourceId,
    title: item.title,
    kind: item.sourceType,
    dayIndex,
    startsAt: spansMultipleDays ? formatDateTimeLabel(startInstant, timezone) : formatTimeInTimezone(startInstant, timezone),
    endsAt: spansMultipleDays ? formatDateTimeLabel(endInstant, timezone) : formatTimeInTimezone(endInstant, timezone),
    startsAtInstant: item.startsAt,
    endsAtInstant: item.endsAt,
    visibility: item.visibility,
    busy: item.busy,
    color: {
      name: item.color.preset,
      background: item.color.background,
      foreground: item.color.foreground,
      border: item.color.border,
    },
    owner,
    status: item.busy ? 'BUSY' : 'FREE',
    workspace: workspaceName,
    participants: [],
    description: `${item.sourceType.toLowerCase()} block from ${item.timezone}.`,
    attachments: 0,
    publicLabel: item.visibility === 'PUBLIC' ? 'Public calendar block' : undefined,
  }
}

function formatDateTimeLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }).format(date)
}

function formatDayLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', timeZone: timezone }).format(date)
}
