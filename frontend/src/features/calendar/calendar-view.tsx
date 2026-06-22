import { CalendarClock, ChevronLeft, ChevronRight, Globe2, Lock, Paperclip, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { calendarItems, itemColors, type CalendarItem } from '../../lib/demo-data'

const days = ['Mon 22', 'Tue 23', 'Wed 24', 'Thu 25', 'Fri 26', 'Sat 27', 'Sun 28']
const hours = Array.from({ length: 18 }, (_, index) => 7 + index)
const hourHeight = 88
const dayWidth = 190
const timezones = ['Europe/Paris', 'UTC', 'America/New_York', 'Africa/Abidjan', 'Asia/Tokyo']

export function CalendarView() {
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [selectedId, setSelectedId] = useState(calendarItems[0]?.id)
  const selected = calendarItems.find((item) => item.id === selectedId) ?? calendarItems[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Scrollable week planning with overlaps, long blocks and public visibility.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="secondary" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" aria-label="Next week">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button>
            <CalendarClock className="h-4 w-4" aria-hidden />
            Event
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel className="overflow-hidden">
          <div className="border-b bg-muted px-4 py-3 text-sm text-muted-foreground">
            Display timezone: <span className="font-medium text-foreground">{timezone}</span>
          </div>
          <div className="max-h-[720px] overflow-auto">
            <div className="grid min-w-[1304px]" style={{ gridTemplateColumns: `80px repeat(${days.length}, ${dayWidth}px)` }}>
              <div className="sticky left-0 top-0 z-20 border-b bg-muted px-3 py-3 text-xs font-medium text-muted-foreground">Time</div>
              {days.map((day) => (
                <div key={day} className="sticky top-0 z-10 border-b border-l bg-muted px-3 py-3 text-sm font-semibold">
                  {day}
                </div>
              ))}
              <div className="sticky left-0 z-10 bg-card">
                {hours.map((hour) => (
                  <div key={hour} className="border-b px-3 py-2 text-xs text-muted-foreground" style={{ height: hourHeight }}>
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {days.map((day, dayIndex) => (
                <DayColumn key={day} dayIndex={dayIndex} selectedId={selected?.id} onSelect={setSelectedId} />
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Entry details</PanelTitle>
            </PanelHeader>
            {selected && <CalendarDetails item={selected} />}
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

function DayColumn({ dayIndex, selectedId, onSelect }: { dayIndex: number; selectedId?: string; onSelect: (id: string) => void }) {
  const items = useMemo(() => layoutDay(calendarItems.filter((item) => item.dayIndex === dayIndex)), [dayIndex])
  return (
    <div className="relative border-l bg-card" style={{ height: hours.length * hourHeight }}>
      {hours.map((hour) => (
        <div key={hour} className="border-b" style={{ height: hourHeight }} />
      ))}
      {items.map(({ item, column, columns }) => {
        const start = toMinutes(item.startsAt)
        const end = toMinutes(item.endsAt)
        const top = ((start - hours[0] * 60) / 60) * hourHeight
        const height = Math.max(42, ((end - start) / 60) * hourHeight - 6)
        const width = (dayWidth - 18) / columns
        const left = 8 + column * width
        const compact = height < 76 || width < 92
        return (
          <button
            key={item.id}
            className="absolute overflow-hidden rounded-md border p-2 text-left text-xs shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="min-w-0 truncate font-semibold leading-4">{item.title}</div>
            <div className="mt-1 min-w-0 truncate leading-4 opacity-80">
              {item.startsAt} - {item.endsAt}
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

function CalendarDetails({ item }: { item: CalendarItem }) {
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
    </PanelBody>
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

function layoutDay(items: CalendarItem[]) {
  return items.map((item) => {
    const overlapping = items.filter((candidate) => toMinutes(candidate.startsAt) < toMinutes(item.endsAt) && toMinutes(candidate.endsAt) > toMinutes(item.startsAt))
    return {
      item,
      column: overlapping.findIndex((candidate) => candidate.id === item.id),
      columns: Math.max(1, overlapping.length),
    }
  })
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}
