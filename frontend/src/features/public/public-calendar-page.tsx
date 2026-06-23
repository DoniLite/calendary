import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, Globe2, Lock, Mail, MessageSquare, User } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { calendarItems } from '../../lib/demo-data'
import { convertWallClockRange, dayIndexInTimezone, formatTimeInTimezone } from '../../lib/timezone'
import { fallbackWorkspaceId, usePublicAvailabilityQuery, usePublicBookingMutation, usePublicCalendarQuery, type PublicCalendarItemResponse } from '../../lib/api'

const hours = Array.from({ length: 24 }, (_, index) => index)
const hourHeight = 56
const publicSlots = ['09:30', '11:30', '16:00', '16:30', 'Friday 10:00', 'Friday 14:30']
const timezones = ['Europe/Paris', 'UTC', 'Africa/Abidjan', 'America/New_York', 'Asia/Tokyo']
const publicItems = calendarItems.filter((item) => item.visibility === 'PUBLIC')
const busyPrivate = [
  { dayIndex: 1, startsAt: '09:00', endsAt: '10:00' },
  { dayIndex: 3, startsAt: '14:00', endsAt: '17:00' },
]
const fallbackRequestSlots = [
  { id: 'slot-1', label: '09:30', startsAt: '2026-07-01T09:30:00Z', endsAt: '2026-07-01T10:00:00Z', available: true },
  { id: 'slot-2', label: '11:30', startsAt: '2026-07-01T11:30:00Z', endsAt: '2026-07-01T12:00:00Z', available: true },
  { id: 'slot-3', label: '16:00', startsAt: '2026-07-01T16:00:00Z', endsAt: '2026-07-01T16:30:00Z', available: true },
  { id: 'slot-4', label: 'Friday 10:00', startsAt: '2026-07-03T10:00:00Z', endsAt: '2026-07-03T10:30:00Z', available: true },
]

export function PublicCalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [selected, setSelected] = useState<PublicSelection | null>(null)
  const days = useMemo(() => weekDays(addDays(startOfWeek(new Date()), weekOffset * 7)), [weekOffset])
  const publicCalendarQuery = usePublicCalendarQuery(fallbackWorkspaceId || undefined, days[0], addDays(days[0], 7))
  const apiItems = publicCalendarQuery.data?.items.map((item, index) => publicApiItemToCalendarItem(item, index, days, timezone))
  const visiblePublicItems = useMemo(() => apiItems ?? publicItems.map((item) => convertWallClockRange(item, days, timezone)), [apiItems, days, timezone])
  const visibleBusyPrivate = useMemo(() => apiItems ? [] : busyPrivate.map((item) => convertWallClockRange(item, days, timezone)), [apiItems, days, timezone])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Doni public calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Public items show their title. Private busy time stays masked so visitors can understand availability without seeing private context.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
            <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <select className="bg-transparent outline-none" value={timezone} onChange={(event) => {
              setTimezone(event.target.value)
              setSelected(null)
            }}>
              {timezones.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" aria-label="Previous week" onClick={() => setWeekOffset((value) => value - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset(0)}>This week</Button>
          <Button variant="secondary" aria-label="Next week" onClick={() => setWeekOffset((value) => value + 1)}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel className="overflow-hidden">
          <div className="border-b bg-muted px-4 py-3 text-sm text-muted-foreground">
            Display timezone: <span className="font-medium text-foreground">{timezone}</span>
            {publicCalendarQuery.isFetching && <span> · Syncing public API</span>}
          </div>
          <div className="max-h-[720px] overflow-auto">
            <div className="grid min-w-[1240px]" style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(160px, 1fr))` }}>
              <div className="sticky left-0 top-0 z-20 border-b bg-muted px-3 py-3 text-xs font-medium text-muted-foreground">Time</div>
              {days.map((day) => (
                <div key={day.toISOString()} className="sticky top-0 z-10 border-b border-l bg-muted px-3 py-3 text-sm font-semibold">
                  {formatDayLabel(day, timezone)}
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
                <PublicDayColumn key={day.toISOString()} dayIndex={dayIndex} publicItems={visiblePublicItems} busyItems={visibleBusyPrivate} onSelect={setSelected} />
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{selected ? 'Selected block' : 'Calendar legend'}</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3 text-sm">
            {selected ? (
              <div className="space-y-3">
                <div className="rounded-md border p-3" style={selected.colorStyle}>
                  <div className="font-semibold">{selected.title}</div>
                  <div className="mt-1 opacity-80">{selected.startsAt} - {selected.endsAt}</div>
                </div>
                <p className="text-muted-foreground">{selected.description}</p>
                <div className="rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Displayed in {timezone}
                </div>
                {selected.entryId ? (
                  <Link
                    to="/p/doni/calendar/$entryId"
                    params={{ entryId: selected.entryId }}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                    Open details
                  </Link>
                ) : (
                  <div className="rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Private blocks are only shown as availability context.
                  </div>
                )}
              </div>
            ) : (
              <>
                <Rule icon={Globe2} text="Public tasks and events expose title, type and color." />
                <Rule icon={Lock} text="Private busy time is only shown as Busy." />
                <Rule icon={CalendarPlus} text="Free slots can be requested." />
              </>
            )}
          </PanelBody>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Visible public blocks</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {visiblePublicItems.map((item) => (
              <Link
                key={item.id}
                to="/p/doni/calendar/$entryId"
                params={{ entryId: item.id }}
                className="block rounded-md border p-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: item.color.background, borderColor: item.color.border }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div style={{ color: item.color.foreground }}>
                    <div className="font-semibold">{item.busy ? item.title : 'Available'}</div>
                    <div className="text-sm opacity-80">{item.startsAt} - {item.endsAt}</div>
                  </div>
                  <Badge tone={item.busy ? 'task' : 'success'}>{item.busy ? item.kind : 'FREE'}</Badge>
                </div>
              </Link>
            ))}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>Week navigation</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3 text-sm text-muted-foreground">
            <p>Use previous and next week to browse past or future public availability.</p>
            <p>Backend integration will request `/public/workspaces/:id/calendar` for the selected range and display timezone.</p>
          </PanelBody>
        </Panel>
      </section>
    </div>
  )
}

export function PublicCalendarEntryPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const entryId = pathname.split('/').at(-1)
  const item = publicItems.find((candidate) => candidate.id === entryId)

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/p/doni/calendar" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to calendar
        </Link>
        <Panel>
          <PanelHeader>
            <PanelTitle>Public entry unavailable</PanelTitle>
          </PanelHeader>
          <PanelBody className="text-sm text-muted-foreground">
            This calendar entry is not public or no longer exists.
          </PanelBody>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link to="/p/doni/calendar" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to calendar
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{item.busy ? item.title : 'Available slot'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.startsAt} - {item.endsAt} · {item.workspace}
            </p>
          </div>
          <Badge tone={item.kind === 'TASK' ? 'task' : item.kind === 'PROJECT' ? 'project' : 'event'}>{item.kind}</Badge>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Details</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-4">
            <div className="rounded-md border p-3" style={{ backgroundColor: item.color.background, color: item.color.foreground, borderColor: item.color.border }}>
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-sm opacity-80">{item.startsAt} - {item.endsAt}</div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <PublicDetailRow label="Workspace" value={item.workspace} />
              <PublicDetailRow label="Owner" value={item.owner} />
              <PublicDetailRow label="Visibility" value={item.visibility} />
              <PublicDetailRow label="Status" value={item.status} />
              {item.project && <PublicDetailRow label="Project" value={item.project} />}
              {item.epic && <PublicDetailRow label="Epic" value={item.epic} />}
            </div>
          </PanelBody>
        </Panel>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Request</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <p className="text-sm text-muted-foreground">Visitors can request a meeting around this public block. Doni still validates the booking before confirmation.</p>
              <Link
                to="/p/doni/request"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Request booking
              </Link>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Privacy</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3 text-sm text-muted-foreground">
              <Rule icon={Globe2} text="This item is public, so its title and description are visible." />
              <Rule icon={Lock} text="Private calendar blocks never expose their detail page." />
            </PanelBody>
          </Panel>
        </aside>
      </section>
    </div>
  )
}

export function PublicAvailabilityPage() {
  const [timezone, setTimezone] = useState('Europe/Paris')
  const start = useMemo(() => startOfWeek(new Date()), [])
  const availabilityQuery = usePublicAvailabilityQuery(fallbackWorkspaceId || undefined, start, addDays(start, 7))
  const slots = availabilityQuery.data?.slots.map((slot, index) => ({
    id: `slot-${index}`,
    label: formatSlotLabel(slot.startsAt, timezone),
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    available: slot.available,
  })) ?? fallbackRequestSlots.map((slot) => ({ ...slot, label: formatSlotLabel(slot.startsAt, timezone) }))
  const firstAvailable = slots.find((slot) => slot.available)?.id ?? slots[0]?.id
  const [selectedSlot, setSelectedSlot] = useState(firstAvailable)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Availability</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a free slot before sending a request.</p>
      </div>
      <label className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
        <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <select className="bg-transparent outline-none" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {timezones.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      <Panel>
        <PanelHeader>
          <PanelTitle>Available slots</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              className={
                selectedSlot === slot.id
                  ? 'rounded-md border border-primary bg-primary/10 p-3 text-left ring-2 ring-primary/20'
                  : slot.available
                    ? 'rounded-md border bg-card p-3 text-left hover:border-primary/60'
                    : 'cursor-not-allowed rounded-md border bg-muted p-3 text-left opacity-60'
              }
              disabled={!slot.available}
              onClick={() => setSelectedSlot(slot.id)}
            >
              <div className="font-semibold">{slot.label}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {slot.available ? '30 min' : 'Busy'}
              </div>
            </button>
          ))}
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>Meeting format</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-3 sm:grid-cols-3">
          <FormatCard title="Duration" value="30 minutes" />
          <FormatCard title="Location" value="Google Meet after approval" />
          <FormatCard title="Notification" value="Email confirmation" />
        </PanelBody>
      </Panel>
    </div>
  )
}

export function PublicRequestPage() {
  const [sent, setSent] = useState(false)
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [slotId, setSlotId] = useState(fallbackRequestSlots[2].id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const start = useMemo(() => startOfWeek(new Date()), [])
  const availabilityQuery = usePublicAvailabilityQuery(fallbackWorkspaceId || undefined, start, addDays(start, 7))
  const slots = availabilityQuery.data?.slots.filter((slot) => slot.available).map((slot, index) => ({
    id: `slot-${index}`,
    label: formatSlotLabel(slot.startsAt, timezone),
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    available: slot.available,
  })) ?? fallbackRequestSlots.map((slot) => ({ ...slot, label: formatSlotLabel(slot.startsAt, timezone) }))
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? slots[0]
  const bookingMutation = usePublicBookingMutation(fallbackWorkspaceId || undefined)
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Request a booking</h1>
        <p className="mt-2 text-sm text-muted-foreground">Doni reviews every request before a Google Meet is created.</p>
      </div>
      <Panel>
        <PanelHeader>
          <PanelTitle>Request form</PanelTitle>
        </PanelHeader>
        <PanelBody>
          {sent ? (
            <div className="rounded-md border border-available/30 bg-available/10 p-4">
              <div className="font-semibold">Request sent</div>
              <p className="mt-2 text-sm text-muted-foreground">
                If Doni accepts, you will receive an email with the meeting time and Google Meet link.
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={(event) => {
              event.preventDefault()
              if (!selectedSlot) return
              if (!fallbackWorkspaceId) {
                setSent(true)
                return
              }
              bookingMutation.mutate({
                requesterName: name,
                requesterEmail: email,
                message,
                startsAt: selectedSlot.startsAt,
                endsAt: selectedSlot.endsAt,
                timezone,
              }, { onSuccess: () => setSent(true) })
            }}>
              <Field icon={User} label="Name">
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" />
              </Field>
              <Field icon={Mail} label="Email">
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ada@example.com" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={Globe2} label="Timezone">
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {timezones.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </Field>
                <Field icon={CalendarPlus} label="Selected slot">
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={selectedSlot?.id ?? ''} onChange={(event) => setSlotId(event.target.value)}>
                    {slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>{slot.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field icon={MessageSquare} label="Message">
                <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should Doni know?" />
              </Field>
              {bookingMutation.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to send this booking request.</div>}
              <Button disabled={bookingMutation.isPending || !selectedSlot}>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                {bookingMutation.isPending ? 'Sending' : 'Send request'}
              </Button>
            </form>
          )}
        </PanelBody>
      </Panel>
    </div>
  )
}

function PublicDayColumn({
  dayIndex,
  publicItems,
  busyItems,
  onSelect,
}: {
  dayIndex: number
  publicItems: typeof calendarItems
  busyItems: typeof busyPrivate
  onSelect: (selection: PublicSelection) => void
}) {
  return (
    <div className="relative border-l bg-card" style={{ height: hours.length * hourHeight }}>
      {hours.map((hour) => (
        <div key={hour} className="border-b" style={{ height: hourHeight }} />
      ))}
      {busyItems.filter((item) => item.dayIndex === dayIndex).map((item) => (
        <PublicBlock
          key={`${item.dayIndex}-${item.startsAt}`}
          title="Busy"
          startsAt={item.startsAt}
          endsAt={item.endsAt}
          color="private"
          onSelect={() => onSelect({
            title: 'Busy',
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            description: 'This time is occupied. The private details are hidden.',
            colorStyle: undefined,
          })}
        />
      ))}
      {publicItems.filter((item) => item.dayIndex === dayIndex).map((item) => (
        <PublicBlock
          key={item.id}
          title={item.busy ? item.title : 'Available'}
          startsAt={item.startsAt}
          endsAt={item.endsAt}
          color={item.busy ? 'public' : 'free'}
          onSelect={() => onSelect({
            title: item.busy ? item.title : 'Available',
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            description: item.description,
            entryId: item.id,
            colorStyle: { backgroundColor: item.color.background, borderColor: item.color.border, color: item.color.foreground },
          })}
        />
      ))}
    </div>
  )
}

function PublicBlock({ title, startsAt, endsAt, color, onSelect }: { title: string; startsAt: string; endsAt: string; color: 'private' | 'public' | 'free'; onSelect: () => void }) {
  const startHour = Number(startsAt.split(':')[0]) + Number(startsAt.split(':')[1]) / 60
  const endHour = Number(endsAt.split(':')[0]) + Number(endsAt.split(':')[1]) / 60
  const top = (startHour - hours[0]) * hourHeight
  const height = Math.max(38, (endHour - startHour) * hourHeight - 6)
  const classes =
    color === 'private'
      ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
      : color === 'free'
        ? 'border-available/30 bg-available/10 text-available'
        : 'border-task/30 bg-task/10 text-foreground'
  const className = `absolute left-2 right-2 overflow-hidden rounded-md border p-2 text-left text-xs ${classes}`
  const children = (
    <>
      <div className="truncate font-semibold">{title}</div>
      <div className="mt-1 truncate opacity-80">{startsAt} - {endsAt}</div>
    </>
  )

  return (
    <button className={`${className} transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`} style={{ top, height }} onClick={onSelect}>
      {children}
    </button>
  )
}

type PublicSelection = {
  title: string
  startsAt: string
  endsAt: string
  description: string
  entryId?: string
  colorStyle?: CSSProperties
}

function Rule({ icon: Icon, text }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <span>{text}</span>
    </div>
  )
}

function FormatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{value}</div>
    </div>
  )
}

function PublicDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 truncate font-medium">{value}</div>
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  )
}

function startOfWeek(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
  return value
}

function addDays(date: Date, days: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function weekDays(start: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function formatDayLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', timeZone: timezone }).format(date)
}

function formatSlotLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(value))
}

function publicApiItemToCalendarItem(item: PublicCalendarItemResponse, index: number, days: Date[], timezone: string) {
  const startsAt = new Date(item.startsAt)
  const color = item.color ?? {
    preset: item.public ? 'BLUE' : 'SLATE',
    background: item.public ? '#dbeafe' : '#e2e8f0',
    foreground: item.public ? '#1e3a8a' : '#1e293b',
    border: item.public ? '#93c5fd' : '#94a3b8',
  } as const
  return {
    id: `public-${index}`,
    title: item.public ? item.title ?? 'Public block' : item.busy ? 'Busy' : 'Available',
    kind: item.sourceType === 'TASK' || item.sourceType === 'PROJECT' ? item.sourceType : 'EVENT',
    dayIndex: dayIndexInTimezone(startsAt, days, timezone),
    startsAt: formatTimeInTimezone(startsAt, timezone),
    endsAt: formatTimeInTimezone(new Date(item.endsAt), timezone),
    visibility: item.public ? 'PUBLIC' : 'PRIVATE',
    busy: item.busy,
    color: {
      name: color.preset,
      background: color.background,
      foreground: color.foreground,
      border: color.border,
    },
    owner: 'Doni',
    status: item.busy ? 'BUSY' : 'AVAILABLE',
    workspace: 'Public calendar',
    participants: [],
    description: item.public ? 'Public calendar entry.' : 'This time is occupied. The private details are hidden.',
    attachments: 0,
    publicLabel: item.public ? 'Public block' : undefined,
  } satisfies typeof calendarItems[number]
}
