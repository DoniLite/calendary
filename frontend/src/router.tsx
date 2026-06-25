import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppShell } from './components/app-shell'
import { CollaboratorShell } from './components/layout/collaborator-shell'
import { PublicShell } from './components/layout/public-shell'
import { CalendarView } from './features/calendar/calendar-view'
import { TimelineView } from './features/timeline/timeline-view'
import { TaskBoardView } from './features/tasks/task-board-view'
import { ProjectsView } from './features/projects/projects-view'
import { BookingView } from './features/calendar/booking-view'
import { PublicAvailabilityPage, PublicCalendarEntryPage, PublicCalendarPage, PublicRequestPage } from './features/public/public-calendar-page'
import { CollaboratorHome } from './features/collaborator/collaborator-home'
import { AcceptInvitationPage, BootstrapPage, ChangePasswordPage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './features/auth/auth-pages'
import {
  EpicCreatePage,
  EpicDetailPage,
  EpicEditPage,
  EventCreatePage,
  EventDetailPage,
  EventEditPage,
  ProjectCreatePage,
  ProjectDetailPage,
  ProjectEditPage,
  TaskCreatePage,
  TaskDetailPage,
  TaskEditPage,
} from './features/details/detail-pages'
import { SettingsView } from './features/settings/settings-view'
import { useWorkspaceSession } from './features/auth/workspace-session'
import { InboxView } from './features/inbox/inbox-view'
import { CollaboratorsView } from './features/collaborators/collaborators-view'
import { fetchDefaultPublicProfile } from './lib/api'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const profile = await fetchDefaultPublicProfile().catch(() => undefined)
    if (!profile) {
      throw redirect({ to: '/login' })
    }
    throw redirect({ to: '/p/$publicSlug/calendar', params: { publicSlug: profile.publicSlug } })
  },
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppRouteLayout,
  notFoundComponent: CalendarView,
})

function AppRouteLayout() {
  const { isAuthenticated, isLoading, user } = useWorkspaceSession()
  const router = appRoute.useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      void router({ to: '/login' })
      return
    }
    if (user?.passwordChangeRequired) {
      void router({ to: '/change-password' })
      return
    }
    if (user?.role === 'COLLABORATOR') {
      void router({ to: '/collab' })
    }
  }, [isAuthenticated, isLoading, router, user?.passwordChangeRequired, user?.role])

  if (isLoading || !isAuthenticated || user?.passwordChangeRequired || user?.role === 'COLLABORATOR') {
    return <RouteGate />
  }

  return <AppShell>{pathname === '/app' ? <CalendarView /> : <Outlet />}</AppShell>
}

function CollaboratorRouteLayout() {
  const { isAuthenticated, isLoading, user } = useWorkspaceSession()
  const router = collaboratorRoute.useNavigate()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      void router({ to: '/login' })
      return
    }
    if (user?.passwordChangeRequired) {
      void router({ to: '/change-password' })
      return
    }
    if (user?.role === 'SUPER_ADMIN') {
      void router({ to: '/app/calendar' })
    }
  }, [isAuthenticated, isLoading, router, user?.passwordChangeRequired, user?.role])

  if (isLoading || !isAuthenticated || user?.passwordChangeRequired || user?.role === 'SUPER_ADMIN') {
    return <RouteGate />
  }

  return <CollaboratorShell />
}

function RouteGate() {
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading session...</div>
}

const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/app/calendar' })
  },
})

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendar',
  component: CalendarView,
})

const timelineRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/timeline',
  component: TimelineView,
})

const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks',
  component: TaskBoardView,
})

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects',
  component: ProjectsView,
})

const bookingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/booking',
  component: BookingView,
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsView,
})

const inboxRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inbox',
  component: InboxView,
})

const collaboratorsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/collaborators',
  component: CollaboratorsView,
})

const taskCreateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks/new',
  component: TaskCreatePage,
})

const taskEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks/$taskId/edit',
  component: TaskEditPage,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks/$taskId',
  component: TaskDetailPage,
})

const projectCreateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects/new',
  component: ProjectCreatePage,
})

const projectEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects/$projectId/edit',
  component: ProjectEditPage,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects/$projectId',
  component: ProjectDetailPage,
})

const epicCreateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/epics/new',
  component: EpicCreatePage,
})

const epicEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/epics/$epicId/edit',
  component: EpicEditPage,
})

const epicDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/epics/$epicId',
  component: EpicDetailPage,
})

const eventCreateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/events/new',
  component: EventCreatePage,
})

const eventEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/events/$eventId/edit',
  component: EventEditPage,
})

const eventDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/events/$eventId',
  component: EventDetailPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const bootstrapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bootstrap',
  component: BootstrapPage,
})

const acceptInvitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invitation',
  component: AcceptInvitationPage,
})

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  component: ChangePasswordPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
})

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p',
  component: PublicShell,
})

const publicIndexRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/',
  beforeLoad: async () => {
    const profile = await fetchDefaultPublicProfile().catch(() => undefined)
    if (!profile) {
      throw redirect({ to: '/login' })
    }
    throw redirect({ to: '/p/$publicSlug/calendar', params: { publicSlug: profile.publicSlug } })
  },
})

const publicSlugRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/$publicSlug',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/p/$publicSlug/calendar', params: { publicSlug: params.publicSlug } })
  },
})

const publicCalendarRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/$publicSlug/calendar',
  component: PublicCalendarPage,
})

const publicCalendarEntryRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/$publicSlug/calendar/$entryId',
  component: PublicCalendarEntryPage,
})

const publicAvailabilityRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/$publicSlug/availability',
  component: PublicAvailabilityPage,
})

const publicRequestRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/$publicSlug/request',
  component: PublicRequestPage,
})

const collaboratorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collab',
  component: CollaboratorRouteLayout,
})

const collaboratorIndexRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/',
  component: CollaboratorHome,
})

const collaboratorCalendarRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/calendar',
  component: CalendarView,
})

const collaboratorTasksRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/tasks',
  component: TaskBoardView,
})

const collaboratorProjectsRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/projects',
  component: ProjectsView,
})

const collaboratorRequestsRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/requests',
  component: InboxView,
})

const collaboratorSettingsRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/settings',
  component: SettingsView,
})

const collaboratorTaskCreateRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/tasks/new',
  component: TaskCreatePage,
})

const collaboratorTaskEditRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/tasks/$taskId/edit',
  component: TaskEditPage,
})

const collaboratorTaskDetailRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/tasks/$taskId',
  component: TaskDetailPage,
})

const collaboratorProjectCreateRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/projects/new',
  component: ProjectCreatePage,
})

const collaboratorProjectEditRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/projects/$projectId/edit',
  component: ProjectEditPage,
})

const collaboratorProjectDetailRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/projects/$projectId',
  component: ProjectDetailPage,
})

const collaboratorEpicCreateRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/epics/new',
  component: EpicCreatePage,
})

const collaboratorEpicEditRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/epics/$epicId/edit',
  component: EpicEditPage,
})

const collaboratorEpicDetailRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/epics/$epicId',
  component: EpicDetailPage,
})

const collaboratorEventCreateRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/events/new',
  component: EventCreatePage,
})

const collaboratorEventEditRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/events/$eventId/edit',
  component: EventEditPage,
})

const collaboratorEventDetailRoute = createRoute({
  getParentRoute: () => collaboratorRoute,
  path: '/events/$eventId',
  component: EventDetailPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  bootstrapRoute,
  acceptInvitationRoute,
  changePasswordRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  appRoute.addChildren([
    appIndexRoute,
    calendarRoute,
    timelineRoute,
    tasksRoute,
    projectsRoute,
    bookingRoute,
    inboxRoute,
    collaboratorsRoute,
    settingsRoute,
    taskCreateRoute,
    taskDetailRoute,
    taskEditRoute,
    projectCreateRoute,
    projectDetailRoute,
    projectEditRoute,
    epicCreateRoute,
    epicDetailRoute,
    epicEditRoute,
    eventCreateRoute,
    eventDetailRoute,
    eventEditRoute,
  ]),
  publicRoute.addChildren([publicIndexRoute, publicSlugRoute, publicCalendarRoute, publicCalendarEntryRoute, publicAvailabilityRoute, publicRequestRoute]),
  collaboratorRoute.addChildren([
    collaboratorIndexRoute,
    collaboratorCalendarRoute,
    collaboratorTasksRoute,
    collaboratorProjectsRoute,
    collaboratorRequestsRoute,
    collaboratorSettingsRoute,
    collaboratorTaskCreateRoute,
    collaboratorTaskDetailRoute,
    collaboratorTaskEditRoute,
    collaboratorProjectCreateRoute,
    collaboratorProjectDetailRoute,
    collaboratorProjectEditRoute,
    collaboratorEpicCreateRoute,
    collaboratorEpicDetailRoute,
    collaboratorEpicEditRoute,
    collaboratorEventCreateRoute,
    collaboratorEventDetailRoute,
    collaboratorEventEditRoute,
  ]),
])

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
