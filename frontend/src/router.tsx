import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from './components/app-shell'
import { CalendarView } from './features/calendar/calendar-view'
import { TimelineView } from './features/timeline/timeline-view'
import { TaskBoardView } from './features/tasks/task-board-view'
import { ProjectsView } from './features/projects/projects-view'
import { BookingView } from './features/calendar/booking-view'

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/calendar' })
  },
})

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: CalendarView,
})

const timelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/timeline',
  component: TimelineView,
})

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: TaskBoardView,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsView,
})

const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/booking',
  component: BookingView,
})

const routeTree = rootRoute.addChildren([indexRoute, calendarRoute, timelineRoute, tasksRoute, projectsRoute, bookingRoute])

export function createCalendaryRouter(initialUrl?: string) {
  return createRouter({
    routeTree,
    history: initialUrl ? createMemoryHistory({ initialEntries: [initialUrl] }) : undefined,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createCalendaryRouter>
  }
}
