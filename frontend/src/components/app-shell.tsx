import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bell, CalendarDays, CheckSquare2, Clock3, Inbox, KanbanSquare, Layers3, LogOut, Plus, Search, Settings, Users } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { Button } from './ui/button'
import { ThemeSwitcher } from '../features/theme/theme-switcher'
import { useWorkspaceSession } from '../features/auth/workspace-session'
import { apiLogout, useNotificationsQuery } from '../lib/api'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/timeline', label: 'Timeline', icon: Clock3 },
  { to: '/app/tasks', label: 'Tasks', icon: KanbanSquare },
  { to: '/app/projects', label: 'Projects', icon: Layers3 },
  { to: '/app/booking', label: 'Booking', icon: Users },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/collaborators', label: 'Collaborators', icon: Users },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { activeWorkspace, apiEnabled, clearSession, user } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const notificationsQuery = useNotificationsQuery(apiEnabled)

  async function handleLogout() {
    await apiLogout().catch(() => undefined)
    clearSession()
    await navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-3 py-4 lg:block">
        <div className="flex h-full flex-col gap-5">
          <div className="px-2">
            <div className="flex items-center gap-3">
              <img src="/avatar.jpeg" alt="Doni" className="h-10 w-10 rounded-md border object-cover" />
              <div className="min-w-0">
                <div className="text-xl font-semibold leading-7">Calendary</div>
                <div className="truncate text-sm text-muted-foreground">Doni time server</div>
              </div>
            </div>
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
              <div className="mt-1 text-sm font-semibold">{activeWorkspace?.name ?? 'No workspace selected'}</div>
              <div className="mt-1 text-xs text-muted-foreground">{activeWorkspace?.accessLevel ?? 'Read'} access</div>
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
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => void navigate({ to: '/app/inbox' })}>
              <Bell className="h-4 w-4" aria-hidden />
              Inbox {notificationsQuery.data?.unreadCount ? `(${notificationsQuery.data.unreadCount})` : ''}
            </Button>
            <div className="hidden min-w-0 text-right text-xs sm:block">
              <div className="truncate font-medium">{user?.email ?? 'Signed out'}</div>
              <div className="text-muted-foreground">{user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Collaborator'}</div>
            </div>
            <img src="/avatar.jpeg" alt="Doni" className="hidden h-9 w-9 rounded-md border object-cover sm:block" />
            <Button variant="ghost" onClick={() => void handleLogout()} aria-label="Sign out">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
            {canWrite && <NewResourceMenu />}
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

function NewResourceMenu() {
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus className="h-4 w-4" aria-hidden />
        New
      </summary>
      <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border bg-card p-2 shadow-panel">
        <NewResourceLink to="/app/events/new" icon={CalendarDays} label="Event" />
        <NewResourceLink to="/app/tasks/new" icon={CheckSquare2} label="Task" />
        <NewResourceLink to="/app/projects/new" icon={Layers3} label="Project" />
        <NewResourceLink to="/app/epics/new" icon={KanbanSquare} label="Epic" />
      </div>
    </details>
  )
}

function NewResourceLink({ to, icon: Icon, label }: { to: '/app/events/new' | '/app/tasks/new' | '/app/projects/new' | '/app/epics/new'; icon: typeof Plus; label: string }) {
  return (
    <Link to={to} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  )
}
