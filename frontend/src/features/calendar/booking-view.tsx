import { Check, X } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/panel'
import { bookingRequests } from '../../lib/demo-data'

export function BookingView() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Booking</h1>
        <p className="text-sm text-muted-foreground">Public appointment requests, availability and decision queue.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Public availability</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {['09:30', '11:30', '16:00', '16:30', 'Friday 10:00', 'Friday 14:30'].map((slot) => (
              <div key={slot} className="rounded-md border border-available/30 bg-available/10 p-3">
                <div className="text-sm font-semibold">{slot}</div>
                <div className="text-xs text-muted-foreground">30 min slot</div>
              </div>
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Requests</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-3">
            {bookingRequests.map((request) => (
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
                {request.status === 'PENDING' && (
                  <div className="mt-3 flex gap-2">
                    <Button className="h-8 flex-1">
                      <Check className="h-4 w-4" aria-hidden />
                      Accept
                    </Button>
                    <Button variant="secondary" className="h-8 flex-1">
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
