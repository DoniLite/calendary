import { Bell, Check, Inbox, MailCheck, Send, X } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { useWorkspaceSession } from '../auth/workspace-session'
import {
  useBookingRequestsQuery,
  useCollaborationInboxQuery,
  useCollaborationSentQuery,
  useInboxMutations,
  useNotificationsQuery,
  type BookingRequestResponse,
  type CollaborationResponse,
} from '../../lib/api'

export function InboxView() {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const bookingsQuery = useBookingRequestsQuery(activeWorkspaceId)
  const notificationsQuery = useNotificationsQuery(apiEnabled)
  const collaborationInboxQuery = useCollaborationInboxQuery(apiEnabled)
  const collaborationSentQuery = useCollaborationSentQuery(apiEnabled)
  const mutations = useInboxMutations(activeWorkspaceId)

  const bookings = bookingsQuery.data?.items ?? []
  const pendingBookings = bookings.filter((request) => request.status === 'PENDING')
  const collaborationInbox = collaborationInboxQuery.data?.collaborations ?? []
  const collaborationSent = collaborationSentQuery.data?.collaborations ?? []
  const notifications = notificationsQuery.data?.items ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Booking decisions, collaboration confirmations and unread activity.</p>
        </div>
        <Button variant="secondary" disabled={!notifications.length || mutations.markAllNotificationsRead.isPending} onClick={() => mutations.markAllNotificationsRead.mutate()}>
          <MailCheck className="h-4 w-4" aria-hidden />
          Mark all read
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <Summary title="Pending bookings" value={String(pendingBookings.length)} />
        <Summary title="Collaboration inbox" value={String(collaborationInbox.filter((item) => item.status === 'PENDING').length)} />
        <Summary title="Sent requests" value={String(collaborationSent.length)} />
        <Summary title="Unread" value={String(notificationsQuery.data?.unreadCount ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden />
              Booking queue
            </PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {bookingsQuery.isPending && <EmptyState label="Loading booking requests..." />}
            {bookingsQuery.isError && <EmptyState label="Unable to load booking requests." />}
            {!bookingsQuery.isPending && !bookings.length && <EmptyState label="No booking requests for this workspace." />}
            {bookings.map((request) => (
              <BookingCard
                key={request.id}
                request={request}
                canWrite={canWrite}
                onAccept={() => mutations.acceptBookingRequest.mutate(request.id)}
                onReject={() => mutations.rejectBookingRequest.mutate(request.id)}
              />
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
              Notifications
            </PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {notificationsQuery.isPending && <EmptyState label="Loading notifications..." />}
            {notificationsQuery.isError && <EmptyState label="Unable to load notifications." />}
            {!notificationsQuery.isPending && !notifications.length && <EmptyState label="No notifications yet." />}
            {notifications.map((notification) => (
              <article key={notification.id} className={notification.readAt ? 'rounded-md border p-3 opacity-70' : 'rounded-md border bg-background p-3'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{notification.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  </div>
                  <Badge tone={notification.readAt ? 'muted' : 'default'}>{notification.type}</Badge>
                </div>
                {!notification.readAt && (
                  <Button variant="ghost" className="mt-3 h-8" onClick={() => mutations.markNotificationRead.mutate(notification.id)}>
                    Mark read
                  </Button>
                )}
              </article>
            ))}
          </PanelBody>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CollaborationPanel title="Collaboration inbox" items={collaborationInbox} direction="inbox" mutations={mutations} />
        <CollaborationPanel title="Sent collaboration requests" items={collaborationSent} direction="sent" mutations={mutations} />
      </section>
    </div>
  )
}

function BookingCard({ request, canWrite, onAccept, onReject }: { request: BookingRequestResponse; canWrite: boolean; onAccept: () => void; onReject: () => void }) {
  return (
    <article className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{request.requesterName}</div>
          <div className="text-sm text-muted-foreground">{request.requesterEmail}</div>
          <div className="mt-1 text-sm">{formatDateTime(request.startsAt)} - {formatTime(request.endsAt)}</div>
        </div>
        <Badge tone={request.status === 'PENDING' ? 'default' : request.status === 'ACCEPTED' ? 'success' : 'danger'}>{request.status}</Badge>
      </div>
      {request.message && <p className="mt-3 text-sm text-muted-foreground">{request.message}</p>}
      {request.status === 'PENDING' && (
        <div className="mt-3 flex gap-2">
          <Button className="h-8 flex-1" disabled={!canWrite} onClick={onAccept}>
            <Check className="h-4 w-4" aria-hidden />
            Accept
          </Button>
          <Button variant="secondary" className="h-8 flex-1" disabled={!canWrite} onClick={onReject}>
            <X className="h-4 w-4" aria-hidden />
            Reject
          </Button>
        </div>
      )}
    </article>
  )
}

export function CollaborationPanel({ title, items, direction, mutations }: { title: string; items: CollaborationResponse[]; direction: 'inbox' | 'sent'; mutations: ReturnType<typeof useInboxMutations> }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          {direction === 'inbox' ? <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden /> : <Send className="h-4 w-4 text-muted-foreground" aria-hidden />}
          {title}
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3">
        {!items.length && <EmptyState label="No collaboration requests." />}
        {items.map((item) => (
          <article key={item.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{item.resourceType} · {item.accessLevel}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {direction === 'inbox' ? item.requestedByEmail : item.recipientEmail}
                </div>
              </div>
              <Badge tone={item.status === 'PENDING' ? 'default' : item.status === 'ACCEPTED' ? 'success' : 'danger'}>{item.status}</Badge>
            </div>
            {item.message && <p className="mt-3 text-sm text-muted-foreground">{item.message}</p>}
            {direction === 'inbox' && item.status === 'PENDING' && (
              <div className="mt-3 flex gap-2">
                <Button className="h-8 flex-1" onClick={() => mutations.acceptCollaboration.mutate(item.id)}>
                  <Check className="h-4 w-4" aria-hidden />
                  Accept
                </Button>
                <Button variant="secondary" className="h-8 flex-1" onClick={() => mutations.rejectCollaboration.mutate(item.id)}>
                  <X className="h-4 w-4" aria-hidden />
                  Reject
                </Button>
              </div>
            )}
          </article>
        ))}
      </PanelBody>
    </Panel>
  )
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </Panel>
  )
}

export function EmptyState({ label }: { label: string }) {
  return <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{label}</div>
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(value))
}
