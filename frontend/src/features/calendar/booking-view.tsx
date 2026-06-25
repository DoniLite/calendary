import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus, Check, Clock, Mail, MessageSquare, User, Video, X } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { FieldError } from '../../components/ui/form-field'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useBookingRequestsQuery, useInboxMutations, usePublicAvailabilityQuery, usePublicBookingMutation, type BookingRequestResponse } from '../../lib/api'
import { bookingRequestSchema, type BookingRequestFormValues } from '../../lib/schemas'
import { formatTimeInTimezone } from '../../lib/timezone'

const timezones = ['Europe/Paris', 'UTC', 'Africa/Abidjan', 'America/New_York', 'Asia/Tokyo']

export function BookingView() {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const bookingRequestsQuery = useBookingRequestsQuery(activeWorkspaceId)
  const mutations = useInboxMutations(activeWorkspaceId)
  const bookingMutation = usePublicBookingMutation(activeWorkspaceId)
  const weekStart = useMemo(() => startOfWeek(new Date()), [])
  const availabilityQuery = usePublicAvailabilityQuery(activeWorkspaceId, weekStart, addDays(weekStart, 7))
  const [selectedSlot, setSelectedSlot] = useState<string>()
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingRequestFormValues>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: { name: '', email: '', timezone: 'Europe/Paris', date: new Date().toISOString().slice(0, 10), time: '09:00', durationMinutes: 60, message: '' },
  })
  const timezone = watch('timezone')
  const visibleSlots = (availabilityQuery.data?.slots ?? [])
    .filter((item) => item.available)
    .map((item, index) => ({ id: `slot-${index}`, label: formatSlotLabel(item.startsAt, timezone), startsAt: item.startsAt, endsAt: item.endsAt }))
  const slot = visibleSlots.find((item) => item.id === selectedSlot) ?? visibleSlots[0]
  const queue = bookingRequestsQuery.data?.items.map((item) => toQueueItem(item, timezone)) ?? []

  function onSubmit(values: BookingRequestFormValues) {
    if (!apiEnabled || !activeWorkspaceId || !slot) {
      return
    }
    bookingMutation.mutate({
      requesterName: values.name,
      requesterEmail: values.email,
      message: values.message,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      timezone: values.timezone,
    }, { onSuccess: () => setSubmitted(true) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booking</h1>
          <p className="text-sm text-muted-foreground">Public appointment requests, visitor form and owner decision queue.</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
          <img src="/avatar.jpeg" alt="Doni" className="h-10 w-10 rounded-md border object-cover" />
          <div>
            <div className="text-sm font-semibold">Meet with Doni</div>
            <div className="text-xs text-muted-foreground">Google Meet created after approval</div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Public availability</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {availabilityQuery.isPending && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">Loading availability...</div>}
              {!availabilityQuery.isPending && !visibleSlots.length && (
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">No available slots this week.</div>
              )}
              {visibleSlots.map((item) => (
                <button
                  key={item.id}
                  className={
                    selectedSlot === item.id
                      ? 'rounded-md border border-primary bg-primary/10 p-3 text-left ring-2 ring-primary/25'
                      : 'rounded-md border border-available/30 bg-available/10 p-3 text-left hover:border-primary/50'
                  }
                  onClick={() => setSelectedSlot(item.id)}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    30 min slot
                  </div>
                </button>
              ))}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Visitor request</PanelTitle>
            </PanelHeader>
            <PanelBody>
              {submitted ? (
                <div className="rounded-md border border-available/30 bg-available/10 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <Check className="h-4 w-4" aria-hidden />
                    Request sent
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Doni will review the request. If accepted, the visitor receives an email with the meeting time and Google Meet link.
                  </p>
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field icon={User} label="Name">
                      <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Ada Lovelace" {...register('name')} />
                      <FieldError message={errors.name?.message} />
                    </Field>
                    <Field icon={Mail} label="Email">
                      <input className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="email" placeholder="ada@example.com" {...register('email')} />
                      <FieldError message={errors.email?.message} />
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field icon={CalendarPlus} label="Selected slot">
                      <input className="h-10 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground outline-none" readOnly value={slot?.label ?? 'No slot selected'} />
                    </Field>
                    <Field icon={Clock} label="Timezone">
                      <select className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('timezone')}>
                        {timezones.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field icon={MessageSquare} label="Message">
                    <textarea className="min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Context, topic, questions..." {...register('message')} />
                  </Field>
                  {bookingMutation.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-3 py-2 text-sm">Unable to send this booking request.</div>}
                  <Button className="w-full sm:w-fit" disabled={bookingMutation.isPending || !slot}>
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                    {bookingMutation.isPending ? 'Sending' : 'Request booking'}
                  </Button>
                </form>
              )}
            </PanelBody>
          </Panel>
        </div>

        <Panel>
          <PanelHeader>
            <PanelTitle>Decision queue</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Select a workspace to load booking requests.</div>}
            {apiEnabled && bookingRequestsQuery.isPending && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Loading booking requests...</div>}
            {apiEnabled && bookingRequestsQuery.isError && <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm">Unable to load booking requests.</div>}
            {apiEnabled && !bookingRequestsQuery.isPending && !queue.length && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">No booking requests for this workspace.</div>}
            {queue.map((request) => (
              <article key={request.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{request.requester}</div>
                    <div className="text-sm text-muted-foreground">
                      {request.startsAt} - {request.endsAt}
                    </div>
                  </div>
                  <Badge tone={request.status === 'PENDING' ? 'default' : request.status === 'ACCEPTED' ? 'success' : 'danger'}>
                    {request.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Video className="h-3.5 w-3.5" aria-hidden />
                  Meet link after approval
                </div>
                {request.status === 'PENDING' && (
                  <div className="mt-3 flex gap-2">
                    <Button className="h-8 flex-1" disabled={!canWrite || !apiEnabled} onClick={() => mutations.acceptBookingRequest.mutate(request.id)}>
                      <Check className="h-4 w-4" aria-hidden />
                      Accept
                    </Button>
                    <Button variant="secondary" className="h-8 flex-1" disabled={!canWrite || !apiEnabled} onClick={() => mutations.rejectBookingRequest.mutate(request.id)}>
                      <X className="h-4 w-4" aria-hidden />
                      Reject
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </PanelBody>
        </Panel>
      </section>
    </div>
  )
}

function toQueueItem(request: BookingRequestResponse, timezone: string) {
  return {
    id: request.id,
    requester: request.requesterName,
    startsAt: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(request.startsAt)),
    endsAt: formatTimeInTimezone(new Date(request.endsAt), timezone),
    status: request.status,
  }
}

function formatSlotLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(value))
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
