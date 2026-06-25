import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { CalendarDays, CheckCheck, CheckSquare2, Inbox, KanbanSquare, Layers3, LogOut, Plus, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { useWorkspaceSession } from '../../features/auth/workspace-session'
import { LanguageSwitcher } from '../../features/theme/language-switcher'
import { ThemeSwitcher } from '../../features/theme/theme-switcher'
import { CommandPalette } from '../../features/search/command-palette'
import { apiLogout, workspaceIconUrl } from '../../lib/api'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/collab', labelKey: 'collaboratorPortal.home', icon: Inbox },
  { to: '/collab/calendar', labelKey: 'collaboratorPortal.sharedCalendar', icon: CalendarDays },
  { to: '/collab/tasks', labelKey: 'collaboratorPortal.sharedTasks', icon: KanbanSquare },
  { to: '/collab/projects', labelKey: 'collaboratorPortal.projects', icon: Layers3 },
  { to: '/collab/requests', labelKey: 'collaboratorPortal.requests', icon: CheckCheck },
  { to: '/collab/settings', labelKey: 'nav.settings', icon: Settings },
] as const

export function CollaboratorShell() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { activeWorkspace, activeWorkspaceId, setActiveWorkspaceId, workspaces, user, clearSession } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const iconUrl = workspaceIconUrl(activeWorkspace?.id, activeWorkspace?.hasCustomIcon)
  const [paletteOpen, setPaletteOpen] = useState(false)

  async function handleLogout() {
    await apiLogout().catch(() => undefined)
    clearSession()
    await navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-card px-3 py-4 lg:block">
        <div className="flex h-full flex-col gap-5">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-3">
              <img src={iconUrl} alt={activeWorkspace?.name ?? 'Calendary'} className="h-10 w-10 rounded-md border object-cover" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user?.email ?? t('collaboratorPortal.collaborator')}</div>
                <div className="text-xs text-muted-foreground">{t('collaboratorPortal.title')}</div>
              </div>
            </div>
            {workspaces.length > 1 && (
              <label className="mt-3 grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t('collaboratorPortal.workspace')}</span>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={activeWorkspaceId}
                  onChange={(event) => setActiveWorkspaceId(event.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} · {workspace.accessLevel.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
                    'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                    active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto space-y-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="border-b bg-background px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">{t('collaboratorPortal.title')}</div>
              <div className="text-sm text-muted-foreground">{t('collaboratorPortal.subtitle')}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPaletteOpen(true)} aria-label={t('nav.search')}>
                <Search className="h-4 w-4" aria-hidden />
              </Button>
              {canWrite && <NewResourceMenu />}
              <img src={iconUrl} alt={activeWorkspace?.name ?? 'Calendary'} className="h-9 w-9 rounded-md border object-cover" />
              <Button variant="ghost" onClick={() => void handleLogout()} aria-label={t('nav.signOut')}>
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 lg:px-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} basePath="/collab" />
    </div>
  )
}

function NewResourceMenu() {
  const { t } = useTranslation()
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus className="h-4 w-4" aria-hidden />
        {t('nav.new')}
      </summary>
      <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border bg-card p-2 shadow-panel">
        <NewResourceLink to="/collab/events/new" icon={CalendarDays} label={t('nav.event')} />
        <NewResourceLink to="/collab/tasks/new" icon={CheckSquare2} label={t('nav.task')} />
        <NewResourceLink to="/collab/projects/new" icon={Layers3} label={t('nav.project')} />
        <NewResourceLink to="/collab/epics/new" icon={KanbanSquare} label={t('nav.epic')} />
      </div>
    </details>
  )
}

function NewResourceLink({ to, icon: Icon, label }: { to: '/collab/events/new' | '/collab/tasks/new' | '/collab/projects/new' | '/collab/epics/new'; icon: typeof Plus; label: string }) {
  return (
    <Link to={to} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  )
}
