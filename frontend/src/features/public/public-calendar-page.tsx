import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, Globe2, Lock, Mail, MessageSquare, User } from 'lucide-react'
import { Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Combobox } from '../../components/ui/combobox'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import type { CalendarItem } from '../../lib/demo-data'
import { bookingRequestSchema, type BookingRequestFormValues } from '../../lib/schemas'
import { dayIndexInTimezone, formatTimeInTimezone } from '../../lib/timezone'
import { usePublicAvailabilityQuery, usePublicBookingMutation, usePublicCalendarItemQuery, usePublicCalendarQuery, usePublicWorkspaceProfileQuery, type CalendarBlockSourceType, type PublicCalendarItemResponse } from '../../lib/api'

const hours = Array.from({ length: 24 }, (_, index) => index)
const hourHeight = 56
const timezones = ['Europe/Paris', 'UTC', 'Africa/Abidjan', 'America/New_York', 'Asia/Tokyo']

export function PublicCalendarPage() {
  const publicWorkspace = usePublicWorkspaceFromRoute()
  const [weekOffset, setWeekOffset] = useState(0)
  const [timezone, setTimezone] = useState(publicWorkspace.defaultTimezone)
  const [selected, setSelected] = useState<PublicSelection | null>(null)
  const days = useMemo(() => weekDays(addDays(startOfWeek(new Date()), weekOffset * 7)), [weekOffset])
  const publicCalendarQuery = usePublicCalendarQuery(publicWorkspace.workspaceId, days[0], addDays(days[0], 7))
  const visiblePublicItems = useMemo(
    () =>
      (publicCalendarQuery.data?.items ?? [])
        .map((item, index) => publicApiItemToCalendarItem(item, index, days, timezone, publicWorkspace.displayName))
        .filter((item) => item.dayIndex >= 0),
    [publicCalendarQuery.data, days, timezone, publicWorkspace.displayName],
  )
  useEffect(() => {
    setTimezone(publicWorkspace.defaultTimezone)
    setSelected(null)
  }, [publicWorkspace.defaultTimezone])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{publicWorkspace.displayName} public calendar</h1>
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
            {(publicWorkspace.isProfileLoading || publicCalendarQuery.isFetching) && <span> · Syncing public API</span>}
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
                <PublicDayColumn key={day.toISOString()} dayIndex={dayIndex} publicItems={visiblePublicItems} onSelect={setSelected} />
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
                    to="/p/$publicSlug/calendar/$entryId"
                    params={{ publicSlug: publicWorkspace.publicSlug, entryId: selected.entryId }}
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
            {publicCalendarQuery.isPending && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Loading public calendar...</div>}
            {!publicCalendarQuery.isPending && !visiblePublicItems.filter((item) => item.visibility === 'PUBLIC').length && (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">No public blocks this week.</div>
            )}
            {visiblePublicItems.filter((item) => item.visibility === 'PUBLIC').map((item) => (
              <Link
                key={item.id}
                to="/p/$publicSlug/calendar/$entryId"
                params={{ publicSlug: publicWorkspace.publicSlug, entryId: item.id }}
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
          </PanelBody>
        </Panel>
      </section>
    </div>
  )
}

export function PublicCalendarEntryPage() {
  const publicWorkspace = usePublicWorkspaceFromRoute()
  const { entryId } = useParams({ strict: false }) as { entryId?: string }
  const [sourceType, sourceId] = parsePublicEntryId(entryId)
  const entryQuery = usePublicCalendarItemQuery(publicWorkspace.workspaceId, sourceType, sourceId)
  const item = entryQuery.data ? publicApiItemToDetailItem(entryQuery.data, sourceId ?? entryId ?? 'public-entry', publicWorkspace.defaultTimezone, publicWorkspace.displayName) : undefined

  if (publicWorkspace.workspaceId && sourceType && sourceId && entryQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/p/$publicSlug/calendar" params={{ publicSlug: publicWorkspace.publicSlug }} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to calendar
        </Link>
        <Panel>
          <PanelHeader>
            <PanelTitle>Loading public entry</PanelTitle>
          </PanelHeader>
          <PanelBody className="text-sm text-muted-foreground">Loading public calendar detail...</PanelBody>
        </Panel>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/p/$publicSlug/calendar" params={{ publicSlug: publicWorkspace.publicSlug }} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
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
        <Link to="/p/$publicSlug/calendar" params={{ publicSlug: publicWorkspace.publicSlug }} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
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
              <p className="text-sm text-muted-foreground">Visitors can request a meeting around this public block. {publicWorkspace.displayName} still validates the booking before confirmation.</p>
              <Link
                to="/p/$publicSlug/request"
                params={{ publicSlug: publicWorkspace.publicSlug }}
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
  const publicWorkspace = usePublicWorkspaceFromRoute()
  const [timezone, setTimezone] = useState(publicWorkspace.defaultTimezone)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDayKey, setSelectedDayKey] = useState<string>()
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset])
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const availabilityQuery = usePublicAvailabilityQuery(publicWorkspace.workspaceId, weekStart, addDays(weekStart, 7))
  const slots = useMemo(
    () =>
      availabilityQuery.data?.slots.map((slot, index) => ({
        id: `slot-${index}`,
        label: formatSlotLabel(slot.startsAt, timezone),
        dayKey: formatDayKey(new Date(slot.startsAt), timezone),
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        available: slot.available,
      })) ?? [],
    [availabilityQuery.data, timezone],
  )
  const slotsByDay = useMemo(() => {
    const map = new Map<string, typeof slots>()
    for (const slot of slots) {
      const bucket = map.get(slot.dayKey)
      if (bucket) bucket.push(slot)
      else map.set(slot.dayKey, [slot])
    }
    return map
  }, [slots])
  const todayKey = useMemo(() => formatDayKey(new Date(), timezone), [timezone])
  const dayOptions = useMemo(
    () =>
      days
        .filter((day) => formatDayKey(day, timezone) >= todayKey)
        .map((day) => {
          const dayKey = formatDayKey(day, timezone)
          const daySlots = slotsByDay.get(dayKey) ?? []
          return {
            dayKey,
            label: formatDayLabel(day, timezone),
            availableCount: daySlots.filter((slot) => slot.available).length,
          }
        }),
    [days, timezone, slotsByDay, todayKey],
  )
  const firstAvailableDayKey = dayOptions.find((day) => day.availableCount > 0)?.dayKey
  const activeDayKey = (selectedDayKey && dayOptions.some((day) => day.dayKey === selectedDayKey)) ? selectedDayKey : (firstAvailableDayKey ?? dayOptions[0]?.dayKey)
  const visibleSlots = activeDayKey ? slotsByDay.get(activeDayKey) ?? [] : []
  const [selectedSlot, setSelectedSlot] = useState<string>()
  useEffect(() => {
    setTimezone(publicWorkspace.defaultTimezone)
  }, [publicWorkspace.defaultTimezone])
  useEffect(() => {
    setSelectedDayKey(undefined)
    setSelectedSlot(undefined)
  }, [weekOffset])
  useEffect(() => {
    if (selectedSlot && visibleSlots.some((slot) => slot.id === selectedSlot)) return
    setSelectedSlot(visibleSlots.find((slot) => slot.available)?.id ?? visibleSlots[0]?.id)
  }, [visibleSlots, selectedSlot])
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Availability</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick a day, then choose a free slot before sending a request.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
            <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <select className="bg-transparent outline-none" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezones.map((value) => (
                <option key={value} value={value}>{value}</option>
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

      <Panel className="overflow-hidden">
        <div className="border-b bg-muted px-4 py-3 text-sm text-muted-foreground">
          Browse days to find a precise time. Displayed in <span className="font-medium text-foreground">{timezone}</span>
          {availabilityQuery.isFetching && <span> · Syncing availability</span>}
        </div>
        <PanelBody className="flex flex-wrap gap-2">
          {dayOptions.map((day) => (
            <button
              key={day.dayKey}
              className={
                activeDayKey === day.dayKey
                  ? 'rounded-md border border-primary bg-primary/10 px-3 py-2 text-left text-sm ring-2 ring-primary/20'
                  : day.availableCount > 0
                    ? 'rounded-md border bg-card px-3 py-2 text-left text-sm hover:border-primary/60'
                    : 'cursor-not-allowed rounded-md border bg-muted px-3 py-2 text-left text-sm opacity-60'
              }
              onClick={() => setSelectedDayKey(day.dayKey)}
            >
              <div className="font-semibold">{day.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {day.availableCount > 0 ? `${day.availableCount} free` : 'No slots'}
              </div>
            </button>
          ))}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Available slots {activeDayKey ? `· ${dayOptions.find((day) => day.dayKey === activeDayKey)?.label}` : ''}</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {availabilityQuery.isPending && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">Loading availability...</div>}
          {!availabilityQuery.isPending && !visibleSlots.length && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No slots available on this day. Use the day picker or week navigation above to try another day.
            </div>
          )}
          {visibleSlots.map((slot) => (
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
  const publicWorkspace = usePublicWorkspaceFromRoute()
  const [sent, setSent] = useState(false)
  const [slotId, setSlotId] = useState<string>()
  const start = useMemo(() => startOfWeek(new Date()), [])
  const availabilityQuery = usePublicAvailabilityQuery(publicWorkspace.workspaceId, start, addDays(start, 7))
  const bookingMutation = usePublicBookingMutation(publicWorkspace.workspaceId)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingRequestFormValues>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: { name: '', email: '', timezone: publicWorkspace.defaultTimezone, message: '' },
  })
  const timezone = watch('timezone')
  const slots = availabilityQuery.data?.slots.filter((slot) => slot.available).map((slot, index) => ({
    id: `slot-${index}`,
    label: formatSlotLabel(slot.startsAt, timezone),
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    available: slot.available,
  })) ?? []
  const selectedSlot = slots.find((slot) => slot.id === slotId) ?? slots[0]
  useEffect(() => {
    setValue('timezone', publicWorkspace.defaultTimezone)
  }, [publicWorkspace.defaultTimezone, setValue])
  useEffect(() => {
    if (!slotId && slots.length) setSlotId(slots[0].id)
  }, [slotId, slots])

  function onSubmit(values: BookingRequestFormValues) {
    if (!selectedSlot) return
    if (!publicWorkspace.workspaceId) {
      setSent(true)
      return
    }
    bookingMutation.mutate({
      requesterName: values.name,
      requesterEmail: values.email,
      message: values.message,
      startsAt: selectedSlot.startsAt,
      endsAt: selectedSlot.endsAt,
      timezone: values.timezone,
    }, { onSuccess: () => setSent(true) })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Request a booking</h1>
        <p className="mt-2 text-sm text-muted-foreground">{publicWorkspace.displayName} reviews every request before a Google Meet is created.</p>
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
                If {publicWorkspace.displayName} accepts, you will receive an email with the meeting time and Google Meet link.
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
              <Field icon={User} label="Name">
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Ada Lovelace" {...register('name')} />
                <FieldError message={errors.name?.message} />
              </Field>
              <Field icon={Mail} label="Email">
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="ada@example.com" {...register('email')} />
                <FieldError message={errors.email?.message} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={Globe2} label="Timezone">
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('timezone')}>
                    {timezones.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </Field>
                <Field icon={CalendarPlus} label="Selected slot">
                  <Combobox
                    options={slots.map((slot) => ({ value: slot.id, label: slot.label }))}
                    value={selectedSlot?.id}
                    onChange={setSlotId}
                    placeholder={slots.length ? 'Pick a slot' : 'No slot available'}
                    searchPlaceholder="Search slots..."
                    emptyText="No slot found."
                    disabled={!slots.length}
                    clearable={false}
                  />
                </Field>
              </div>
              {!availabilityQuery.isPending && !slots.length && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">No available slots this week. Try a later week.</div>
              )}
              <Field icon={MessageSquare} label="Message">
                <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={`What should ${publicWorkspace.displayName} know?`} {...register('message')} />
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

type PublicDayItem = ReturnType<typeof publicApiItemToCalendarItem>

function PublicDayColumn({
  dayIndex,
  publicItems,
  onSelect,
}: {
  dayIndex: number
  publicItems: PublicDayItem[]
  onSelect: (selection: PublicSelection) => void
}) {
  return (
    <div className="relative border-l bg-card" style={{ height: hours.length * hourHeight }}>
      {hours.map((hour) => (
        <div key={hour} className="border-b" style={{ height: hourHeight }} />
      ))}
      {publicItems.filter((item) => item.dayIndex === dayIndex).map((item) => {
        const isPublic = item.visibility === 'PUBLIC'
        return (
          <PublicBlock
            key={item.id}
            title={item.busy ? item.title : 'Available'}
            startsAt={item.startsAt}
            endsAt={item.endsAt}
            color={!item.busy ? 'free' : isPublic ? 'public' : 'private'}
            onSelect={() => onSelect({
              title: item.busy ? item.title : 'Available',
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              description: item.description,
              entryId: isPublic ? item.id : undefined,
              colorStyle: isPublic ? { backgroundColor: item.color.background, borderColor: item.color.border, color: item.color.foreground } : undefined,
            })}
          />
        )
      })}
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

function usePublicWorkspaceFromRoute() {
  const { publicSlug } = useParams({ strict: false }) as { publicSlug?: string }
  const profileQuery = usePublicWorkspaceProfileQuery(publicSlug)
  const displayName = profileQuery.data?.name ?? publicSlug ?? 'Calendary'
  return {
    publicSlug: publicSlug ?? '',
    displayName,
    workspaceId: profileQuery.data?.id,
    defaultTimezone: profileQuery.data?.defaultTimezone ?? 'Europe/Paris',
    isProfileLoading: profileQuery.isPending,
  }
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

function formatDayKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone }).format(date)
}

function formatSlotLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(value))
}

function publicApiItemToCalendarItem(item: PublicCalendarItemResponse, index: number, days: Date[], timezone: string, workspaceName: string) {
  const startsAt = new Date(item.startsAt)
  const color = item.color ?? {
    preset: item.public ? 'BLUE' : 'SLATE',
    background: item.public ? '#dbeafe' : '#e2e8f0',
    foreground: item.public ? '#1e3a8a' : '#1e293b',
    border: item.public ? '#93c5fd' : '#94a3b8',
  } as const
  return {
    id: item.public && item.sourceId && item.sourceType ? `${item.sourceType}:${item.sourceId}` : `public-${index}`,
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
    owner: workspaceName,
    status: item.busy ? 'BUSY' : 'AVAILABLE',
    workspace: workspaceName,
    project: undefined,
    epic: undefined,
    participants: [],
    description: item.public ? 'Public calendar entry.' : 'This time is occupied. The private details are hidden.',
    attachments: 0,
    publicLabel: item.public ? 'Public block' : undefined,
  } satisfies CalendarItem
}

function publicApiItemToDetailItem(item: PublicCalendarItemResponse, id: string, timezone: string, workspaceName: string) {
  const color = item.color ?? {
    preset: item.public ? 'BLUE' : 'SLATE',
    background: item.public ? '#dbeafe' : '#e2e8f0',
    foreground: item.public ? '#1e3a8a' : '#1e293b',
    border: item.public ? '#93c5fd' : '#94a3b8',
  } as const
  return {
    id,
    title: item.title ?? 'Public block',
    kind: item.sourceType === 'TASK' || item.sourceType === 'PROJECT' ? item.sourceType : 'EVENT',
    dayIndex: 0,
    startsAt: formatTimeInTimezone(new Date(item.startsAt), timezone),
    endsAt: formatTimeInTimezone(new Date(item.endsAt), timezone),
    visibility: 'PUBLIC',
    busy: item.busy,
    color: {
      name: color.preset,
      background: color.background,
      foreground: color.foreground,
      border: color.border,
    },
    owner: workspaceName,
    status: item.busy ? 'BUSY' : 'AVAILABLE',
    workspace: workspaceName,
    project: undefined,
    epic: undefined,
    participants: [],
    description: 'Public calendar entry.',
    attachments: 0,
    publicLabel: 'Public block',
  } satisfies CalendarItem
}

function parsePublicEntryId(entryId?: string): [CalendarBlockSourceType | undefined, string | undefined] {
  if (!entryId?.includes(':')) return [undefined, undefined]
  const [sourceType, sourceId] = entryId.split(':')
  if (sourceType !== 'EVENT' && sourceType !== 'TASK' && sourceType !== 'PROJECT') return [undefined, undefined]
  return [sourceType, sourceId]
}
