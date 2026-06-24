import { CalendarDays, CheckSquare2, Layers3 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../components/ui/command'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useCalendarQuery, useProjectsQuery, useTasksQuery } from '../../lib/api'

/**
 * Minimal global Cmd+K / Ctrl+K command palette. This is a foundation: it does substring
 * matching (via cmdk's default filter) over titles already loaded by existing list queries —
 * no fuzzy ranking, no dedicated search backend. Extend with more sources or smarter ranking
 * later.
 *
 * Open state is owned by the caller so other UI (e.g. a header search button) can trigger it
 * too; this component only adds the global Cmd+K / Ctrl+K shortcut.
 */
export function CommandPalette({
  open,
  onOpenChange,
  basePath = '/app',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Route prefix used to build detail links, e.g. `/app` or `/collab`. */
  basePath?: '/app' | '/collab'
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeWorkspaceId, apiEnabled } = useWorkspaceSession()

  const tasksQuery = useTasksQuery(apiEnabled ? activeWorkspaceId : undefined)
  const projectsQuery = useProjectsQuery(apiEnabled ? activeWorkspaceId : undefined)
  const calendarRange = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const end = new Date()
    end.setDate(end.getDate() + 60)
    return { start, end }
  }, [])
  const calendarQuery = useCalendarQuery(apiEnabled ? activeWorkspaceId : undefined, calendarRange.start, calendarRange.end)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  function go(to: string) {
    onOpenChange(false)
    void navigate({ to })
  }

  const tasks = tasksQuery.data?.items ?? []
  const projects = projectsQuery.data?.projects ?? []
  const events = calendarQuery.data?.items.filter((item) => item.sourceType === 'EVENT') ?? []

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('search.paletteTitle')} description={t('search.paletteDescription')}>
      <CommandInput placeholder={t('search.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('search.empty')}</CommandEmpty>
        {tasks.length > 0 && (
          <CommandGroup heading={t('search.tasks')}>
            {tasks.map((task) => (
              <CommandItem key={task.id} value={task.title} onSelect={() => go(`${basePath}/tasks/${task.id}`)}>
                <CheckSquare2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate">{task.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {projects.length > 0 && (
          <CommandGroup heading={t('search.projects')}>
            {projects.map((project) => (
              <CommandItem key={project.id} value={project.title} onSelect={() => go(`${basePath}/projects/${project.id}`)}>
                <Layers3 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate">{project.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {events.length > 0 && (
          <CommandGroup heading={t('search.events')}>
            {events.map((event) => (
              <CommandItem key={event.sourceId} value={event.title} onSelect={() => go(`${basePath}/events/${event.sourceId}`)}>
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate">{event.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
