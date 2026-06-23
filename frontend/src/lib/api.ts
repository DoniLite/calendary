import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const fallbackWorkspaceId = import.meta.env.VITE_CALENDARY_WORKSPACE_ID?.trim() || ''

export type CalendarColorPreset = 'ORANGE' | 'BLUE' | 'GREEN' | 'ROSE' | 'VIOLET' | 'SLATE' | 'AMBER'
export type CalendarVisibility = 'PRIVATE' | 'PUBLIC'
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProjectStatus = 'BACKLOG' | 'ACTIVE' | 'PAUSED' | 'DONE'
export type ProjectType = 'PROJECT' | 'EPIC'
export type EventStatus = 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
export type CalendarBlockSourceType = 'EVENT' | 'TASK' | 'PROJECT'
export type UserRole = 'SUPER_ADMIN' | 'COLLABORATOR'
export type WorkspaceAccessLevel = 'READ' | 'WRITE' | 'OWNER'
export type BookingRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'
export type NotificationType = 'INVITATION_CREATED' | 'INVITATION_ACCEPTED' | 'BOOKING_REQUESTED' | 'BOOKING_ACCEPTED' | 'BOOKING_REJECTED' | 'COLLABORATION_REQUESTED' | 'COLLABORATION_ACCEPTED' | 'COLLABORATION_REJECTED' | 'RESOURCE_SHARED' | 'RESOURCE_UPDATED'
export type ShareStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'
export type ResourceType = 'EVENT' | 'TASK' | 'PROJECT'

export type AuthenticatedUserResponse = {
  id: string
  email: string
  role: UserRole
  status: string
  passwordChangeRequired: boolean
}

export type WorkspaceResponse = {
  id: string
  name: string
  type: 'PERSONAL'
  accessLevel: WorkspaceAccessLevel
  ownerId: string
}

export type WorkspaceListResponse = {
  items: WorkspaceResponse[]
}

export type LoginPayload = {
  email: string
  password: string
}

export type BootstrapSuperAdminPayload = LoginPayload & {
  workspaceName: string
}

export type AcceptInvitationPayload = {
  token: string
  password: string
  workspaceName: string
}

export type InviteCollaboratorPayload = {
  email: string
  accessLevel: Exclude<WorkspaceAccessLevel, 'OWNER'>
  expiresInDays: number
}

export type CreatedInvitationResponse = {
  id: string
  email: string
  accessLevel: WorkspaceAccessLevel
  token: string
  expiresAt: string
}

export type CalendarColorResponse = {
  preset: CalendarColorPreset
  background: string
  foreground: string
  border: string
}

export type TaskResponse = {
  id: string
  workspaceId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  visibility: CalendarVisibility
  color: CalendarColorResponse
  dueAt: string | null
  projectId: string | null
  epicId: string | null
  parentTaskId: string | null
  estimateMinutes: number | null
}

export type TaskListResponse = {
  items: TaskResponse[]
}

export type ProjectResponse = {
  id: string
  workspaceId: string
  parentProjectId: string | null
  title: string
  description: string
  type: ProjectType
  status: ProjectStatus
  visibility: CalendarVisibility
  color: CalendarColorResponse
  startsAt: string | null
  dueAt: string | null
}

export type ProjectListResponse = {
  projects: ProjectResponse[]
}

export type EventResponse = {
  id: string
  workspaceId: string
  title: string
  description: string
  startsAt: string
  endsAt: string
  timezone: string
  conferenceUrl: string | null
  externalCalendarEventId: string | null
  visibility: CalendarVisibility
  color: CalendarColorResponse
  status: EventStatus
}

export type CalendarItemResponse = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  timezone: string
  sourceType: CalendarBlockSourceType
  sourceId: string
  visibility: CalendarVisibility
  color: CalendarColorResponse
  busy: boolean
}

export type CalendarResponse = {
  workspaceId: string
  start: string
  end: string
  items: CalendarItemResponse[]
}

export type PublicCalendarItemResponse = {
  startsAt: string
  endsAt: string
  busy: boolean
  public: boolean
  title: string | null
  sourceType: CalendarBlockSourceType | null
  color: CalendarColorResponse | null
}

export type PublicCalendarResponse = {
  workspaceId: string
  start: string
  end: string
  items: PublicCalendarItemResponse[]
}

export type PublicAvailabilitySlotResponse = {
  startsAt: string
  endsAt: string
  available: boolean
}

export type PublicAvailabilityResponse = {
  workspaceId: string
  start: string
  end: string
  slotMinutes: number
  slots: PublicAvailabilitySlotResponse[]
}

export type CreatePublicBookingRequestPayload = {
  requesterName: string
  requesterEmail: string
  message: string
  startsAt: string
  endsAt: string
  timezone: string
}

export type BookingRequestResponse = {
  id: string
  workspaceId: string
  requesterName: string
  requesterEmail: string
  message: string
  startsAt: string
  endsAt: string
  timezone: string
  conferenceUrl: string | null
  externalCalendarEventId: string | null
  status: BookingRequestStatus
}

export type BookingRequestListResponse = {
  items: BookingRequestResponse[]
}

export type NotificationResponse = {
  id: string
  notificationId: string
  type: NotificationType
  title: string
  body: string
  resourceType: string | null
  resourceId: string | null
  actionUrl: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationListResponse = {
  unreadCount: number
  items: NotificationResponse[]
}

export type CollaborationResponse = {
  id: string
  resourceType: ResourceType
  resourceId: string
  ownerWorkspaceId: string
  requestedById: string
  requestedByEmail: string
  recipientId: string
  recipientEmail: string
  accessLevel: WorkspaceAccessLevel
  status: ShareStatus
  message: string
  decidedAt: string | null
}

export type CollaborationListResponse = {
  collaborations: CollaborationResponse[]
}

export type ProposeCollaborationPayload = {
  resourceType: ResourceType
  resourceId: string
  recipientEmail: string
  accessLevel: Exclude<WorkspaceAccessLevel, 'OWNER'>
  message: string
}

export type AttachmentResponse = {
  id: string
  resourceType: ResourceType
  resourceId: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  checksumSha256: string | null
  createdAt: string
}

export type AttachmentListResponse = {
  attachments: AttachmentResponse[]
}

export type AttachmentDownloadResponse = {
  attachment: AttachmentResponse
  url: string
}

export type UpsertTaskPayload = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  visibility: CalendarVisibility
  colorPreset: CalendarColorPreset
  dueAt?: string | null
  projectId?: string | null
  epicId?: string | null
  parentTaskId?: string | null
  estimateMinutes?: number | null
  plannedStart?: string | null
  plannedEnd?: string | null
  timezone: string
}

export type UpsertProjectPayload = {
  title: string
  description: string
  type: ProjectType
  status: ProjectStatus
  visibility: CalendarVisibility
  colorPreset: CalendarColorPreset
  parentProjectId?: string | null
  startsAt?: string | null
  dueAt?: string | null
}

export type UpsertEventPayload = {
  title: string
  description: string
  startsAt: string
  endsAt: string
  timezone: string
  visibility: CalendarVisibility
  colorPreset: CalendarColorPreset
  status?: EventStatus
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body })
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body })
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', formData })
}

export async function apiLogout(path = '/api/auth/logout'): Promise<void> {
  await apiRequest<void>(path, { method: 'POST', parseJson: false })
}

async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; formData?: FormData; parseJson?: boolean } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`API request failed: ${response.status}${detail ? ` ${detail}` : ''}`)
  }

  if (options.parseJson === false || response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function useApiQuery<T>(key: Array<string>, path: string, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet<T>(path),
    enabled,
  })
}

export function useTasksQuery(workspaceId?: string) {
  return useApiQuery<TaskListResponse>(['tasks', workspaceId ?? 'none'], `/api/workspaces/${workspaceId}/tasks`, Boolean(workspaceId))
}

export function useProjectsQuery(workspaceId?: string, type?: ProjectType) {
  const query = type ? `?type=${type}` : ''
  return useApiQuery<ProjectListResponse>(['projects', workspaceId ?? 'none', type ?? 'all'], `/api/workspaces/${workspaceId}/projects${query}`, Boolean(workspaceId))
}

export function useCalendarQuery(workspaceId: string | undefined, start: Date, end: Date) {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const query = `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
  return useApiQuery<CalendarResponse>(['calendar', workspaceId ?? 'none', startIso, endIso], `/api/workspaces/${workspaceId}/calendar${query}`, Boolean(workspaceId))
}

export function useEventQuery(workspaceId?: string, eventId?: string) {
  return useApiQuery<EventResponse>(['events', workspaceId ?? 'none', eventId ?? 'none'], `/api/workspaces/${workspaceId}/events/${eventId}`, Boolean(workspaceId && eventId))
}

export function useTaskQuery(workspaceId?: string, taskId?: string) {
  const tasksQuery = useTasksQuery(workspaceId)
  return {
    ...tasksQuery,
    data: tasksQuery.data?.items.find((task) => task.id === taskId),
  }
}

export function useProjectQuery(workspaceId?: string, projectId?: string) {
  return useApiQuery<ProjectResponse>(['projects', workspaceId ?? 'none', projectId ?? 'none'], `/api/workspaces/${workspaceId}/projects/${projectId}`, Boolean(workspaceId && projectId))
}

export function usePublicCalendarQuery(workspaceId: string | undefined, start: Date, end: Date) {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const query = `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
  return useApiQuery<PublicCalendarResponse>(['public-calendar', workspaceId ?? 'none', startIso, endIso], `/public/workspaces/${workspaceId}/calendar${query}`, Boolean(workspaceId))
}

export function usePublicAvailabilityQuery(workspaceId: string | undefined, start: Date, end: Date, slotMinutes = 30) {
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const query = `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&slotMinutes=${slotMinutes}`
  return useApiQuery<PublicAvailabilityResponse>(['public-availability', workspaceId ?? 'none', startIso, endIso, String(slotMinutes)], `/public/workspaces/${workspaceId}/availability${query}`, Boolean(workspaceId))
}

export function useAttachmentQuery(resourceType?: ResourceType, resourceId?: string, enabled = true) {
  return useApiQuery<AttachmentListResponse>(['attachments', resourceType ?? 'none', resourceId ?? 'none'], `/api/resources/${resourceType}/${resourceId}/attachments`, Boolean(enabled && resourceType && resourceId))
}

export function useBookingRequestsQuery(workspaceId?: string) {
  return useApiQuery<BookingRequestListResponse>(['booking-requests', workspaceId ?? 'none'], `/api/workspaces/${workspaceId}/booking-requests`, Boolean(workspaceId))
}

export function useNotificationsQuery(enabled = true) {
  return useApiQuery<NotificationListResponse>(['notifications'], '/api/notifications', enabled)
}

export function useCollaborationInboxQuery(enabled = true) {
  return useApiQuery<CollaborationListResponse>(['collaborations', 'inbox'], '/api/collaborations/inbox', enabled)
}

export function useCollaborationSentQuery(enabled = true) {
  return useApiQuery<CollaborationListResponse>(['collaborations', 'sent'], '/api/collaborations/sent', enabled)
}

export function useInboxMutations(workspaceId?: string) {
  const queryClient = useQueryClient()

  function invalidateInbox() {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['collaborations'] })
    if (workspaceId) {
      void queryClient.invalidateQueries({ queryKey: ['booking-requests', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] })
    }
  }

  const acceptBookingRequest = useMutation({
    mutationFn: (id: string) => apiPatch<BookingRequestResponse>(`/api/workspaces/${workspaceId}/booking-requests/${id}/accept`, {}),
    onSuccess: invalidateInbox,
  })

  const rejectBookingRequest = useMutation({
    mutationFn: (id: string) => apiPatch<BookingRequestResponse>(`/api/workspaces/${workspaceId}/booking-requests/${id}/reject`, {}),
    onSuccess: invalidateInbox,
  })

  const acceptCollaboration = useMutation({
    mutationFn: (id: string) => apiPatch<CollaborationResponse>(`/api/collaborations/${id}/accept`, {}),
    onSuccess: invalidateInbox,
  })

  const rejectCollaboration = useMutation({
    mutationFn: (id: string) => apiPatch<CollaborationResponse>(`/api/collaborations/${id}/reject`, {}),
    onSuccess: invalidateInbox,
  })

  const markNotificationRead = useMutation({
    mutationFn: (id: string) => apiPatch<NotificationResponse>(`/api/notifications/${id}/read`, {}),
    onSuccess: invalidateInbox,
  })

  const markAllNotificationsRead = useMutation({
    mutationFn: () => apiPatch<NotificationListResponse>('/api/notifications/read-all', {}),
    onSuccess: invalidateInbox,
  })

  return {
    acceptBookingRequest,
    rejectBookingRequest,
    acceptCollaboration,
    rejectCollaboration,
    markNotificationRead,
    markAllNotificationsRead,
  }
}

export function useCollaborationMutations() {
  const queryClient = useQueryClient()
  return {
    proposeCollaboration: useMutation({
      mutationFn: (payload: ProposeCollaborationPayload) => apiPost<CollaborationResponse>('/api/collaborations', payload),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['collaborations'] })
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      },
    }),
  }
}

export function usePublicBookingMutation(workspaceId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePublicBookingRequestPayload) => {
      if (!workspaceId) throw new Error('No public workspace selected.')
      return apiPost<BookingRequestResponse>(`/public/workspaces/${workspaceId}/booking-requests`, payload)
    },
    onSuccess: () => {
      if (!workspaceId) return
      void queryClient.invalidateQueries({ queryKey: ['public-availability', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['public-calendar', workspaceId] })
    },
  })
}

export function useAttachmentMutations(resourceType?: ResourceType, resourceId?: string) {
  const queryClient = useQueryClient()

  function invalidateAttachments() {
    void queryClient.invalidateQueries({ queryKey: ['attachments', resourceType ?? 'none', resourceId ?? 'none'] })
  }

  return {
    uploadAttachment: useMutation({
      mutationFn: (file: File) => {
        if (!resourceType || !resourceId) throw new Error('No resource selected.')
        const formData = new FormData()
        formData.append('file', file)
        return apiPostForm<AttachmentResponse>(`/api/resources/${resourceType}/${resourceId}/attachments`, formData)
      },
      onSuccess: invalidateAttachments,
    }),
    createDownloadUrl: useMutation({
      mutationFn: (attachmentId: string) => {
        if (!resourceType || !resourceId) throw new Error('No resource selected.')
        return apiGet<AttachmentDownloadResponse>(`/api/resources/${resourceType}/${resourceId}/attachments/${attachmentId}/download-url`)
      },
    }),
  }
}

export function useResourceMutations(workspaceId?: string) {
  const queryClient = useQueryClient()

  function invalidateWorkspace() {
    if (!workspaceId) return
    void queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] })
  }

  function requireWorkspace() {
    if (!workspaceId) {
      throw new Error('No active workspace selected.')
    }
    return workspaceId
  }

  const createTask = useMutation({
    mutationFn: (payload: UpsertTaskPayload) => apiPost<TaskResponse>(`/api/workspaces/${requireWorkspace()}/tasks`, payload),
    onSuccess: invalidateWorkspace,
  })

  const updateTask = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertTaskPayload }) => apiPatch<TaskResponse>(`/api/workspaces/${requireWorkspace()}/tasks/${id}`, payload),
    onSuccess: invalidateWorkspace,
  })

  const createProject = useMutation({
    mutationFn: (payload: UpsertProjectPayload) => apiPost<ProjectResponse>(`/api/workspaces/${requireWorkspace()}/projects`, payload),
    onSuccess: invalidateWorkspace,
  })

  const updateProject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertProjectPayload }) => apiPatch<ProjectResponse>(`/api/workspaces/${requireWorkspace()}/projects/${id}`, payload),
    onSuccess: invalidateWorkspace,
  })

  const createEvent = useMutation({
    mutationFn: (payload: UpsertEventPayload) => apiPost<EventResponse>(`/api/workspaces/${requireWorkspace()}/events`, withoutEventStatus(payload)),
    onSuccess: invalidateWorkspace,
  })

  const updateEvent = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertEventPayload }) => apiPatch<EventResponse>(`/api/workspaces/${requireWorkspace()}/events/${id}`, payload),
    onSuccess: invalidateWorkspace,
  })

  return { createTask, updateTask, createProject, updateProject, createEvent, updateEvent }
}

function withoutEventStatus(payload: UpsertEventPayload) {
  const { status: _status, ...createPayload } = payload
  return createPayload
}
