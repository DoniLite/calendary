import { Link, Outlet, useParams, useRouterState } from '@tanstack/react-router'
import { CalendarDays, Clock, LogIn, Mail } from 'lucide-react'
import { ThemeSwitcher } from '../../features/theme/theme-switcher'
import { usePublicWorkspaceProfileQuery } from '../../lib/api'
import { cn } from '../../lib/utils'

export function PublicShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const params = useParams({ strict: false }) as { publicSlug?: string }
  const publicSlug = params.publicSlug ?? ''
  const profileQuery = usePublicWorkspaceProfileQuery(publicSlug)
  const profileName = profileQuery.data?.name ?? publicSlug ?? 'Calendary'
  const navItems = [
    { to: '/p/$publicSlug/calendar', params: { publicSlug }, href: `/p/${publicSlug}/calendar`, label: 'Calendar', icon: CalendarDays, primary: false },
    { to: '/p/$publicSlug/availability', params: { publicSlug }, href: `/p/${publicSlug}/availability`, label: 'Availability', icon: Clock, primary: false },
    { to: '/p/$publicSlug/request', params: { publicSlug }, href: `/p/${publicSlug}/request`, label: 'Request', icon: Mail, primary: true },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link to="/p/$publicSlug/calendar" params={{ publicSlug }} className="flex min-w-0 items-center gap-3">
              <img src="/avatar.jpeg" alt={profileName} className="h-11 w-11 rounded-md border object-cover" />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{profileName}</div>
                <div className="truncate text-sm text-muted-foreground">Public calendar</div>
              </div>
            </Link>
            <div className="w-44 shrink-0 md:hidden">
              <ThemeSwitcher />
            </div>
          </div>

          <nav className="grid grid-cols-3 gap-2 md:flex md:items-center">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  params={item.params}
                  className={cn(
                    'inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium sm:px-3',
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border bg-background hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
              <LogIn className="h-4 w-4" aria-hidden />
              Login
            </Link>
            <div className="w-48">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
