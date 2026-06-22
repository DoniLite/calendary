import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, CalendarDays, Clock3, KanbanSquare, Layers3, Plus, Search, Users } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { Button } from './ui/button'
import { ThemeSwitcher } from '../features/theme/theme-switcher'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/timeline', label: 'Timeline', icon: Clock3 },
  { to: '/tasks', label: 'Tasks', icon: KanbanSquare },
  { to: '/projects', label: 'Projects', icon: Layers3 },
  { to: '/booking', label: 'Booking', icon: Users },
]

export function AppShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-3 py-4 lg:block">
        <div className="flex h-full flex-col gap-5">
          <div className="px-2">
            <div className="text-xl font-semibold leading-7">Calendary</div>
            <div className="text-sm text-muted-foreground">Personal time server</div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-lg border bg-background p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Workspace</div>
              <div className="mt-1 text-sm font-semibold">Owner workspace</div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 w-2/3 rounded-full bg-primary" />
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex max-w-md items-center gap-2 rounded-md border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Search tasks, events, projects"
                />
              </div>
            </div>
            <Button variant="secondary" className="hidden sm:inline-flex">
              <Bell className="h-4 w-4" aria-hidden />
              Inbox
            </Button>
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              New
            </Button>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t px-2 py-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground',
                    active && 'bg-primary text-primary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  )
}
