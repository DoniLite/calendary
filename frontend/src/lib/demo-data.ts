export type CalendarKind = 'EVENT' | 'TASK' | 'PROJECT'
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ItemColor = {
  name: string
  background: string
  foreground: string
  border: string
}

export const itemColors: ItemColor[] = [
  { name: 'Orange', background: '#ffedd5', foreground: '#9a3412', border: '#fdba74' },
  { name: 'Blue', background: '#dbeafe', foreground: '#1e3a8a', border: '#93c5fd' },
  { name: 'Green', background: '#dcfce7', foreground: '#166534', border: '#86efac' },
  { name: 'Rose', background: '#ffe4e6', foreground: '#9f1239', border: '#fda4af' },
  { name: 'Violet', background: '#ede9fe', foreground: '#5b21b6', border: '#c4b5fd' },
  { name: 'Slate', background: '#e2e8f0', foreground: '#1e293b', border: '#94a3b8' },
  { name: 'Amber', background: '#fef3c7', foreground: '#92400e', border: '#fcd34d' },
]

export type CalendarItem = {
  id: string
  sourceId?: string
  title: string
  kind: CalendarKind
  dayIndex: number
  startsAt: string
  endsAt: string
  visibility: 'PRIVATE' | 'PUBLIC'
  busy: boolean
  color: ItemColor
  owner: string
  status: string
  workspace: string
  project?: string
  epic?: string
  participants: string[]
  description: string
  attachments: number
  publicLabel?: string
}

export type TaskItem = {
  id: string
  title: string
  project: string
  epic: string
  status: TaskStatus
  priority: Priority
  estimateMinutes: number
  dueAt: string
  color: ItemColor
}

export type ProjectItem = {
  id: string
  title: string
  type: 'PROJECT' | 'EPIC'
  status: 'BACKLOG' | 'ACTIVE' | 'PAUSED' | 'DONE'
  progress: number
  dueAt: string
  tasks: number
  color: ItemColor
}

export type BookingRequest = {
  id: string
  requester: string
  startsAt: string
  endsAt: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}

export const calendarItems: CalendarItem[] = [
  {
    id: 'evt-1',
    title: 'Client kickoff',
    kind: 'EVENT',
    dayIndex: 1,
    startsAt: '09:00',
    endsAt: '10:00',
    visibility: 'PRIVATE',
    busy: true,
    color: itemColors[1],
    owner: 'Doni',
    status: 'CONFIRMED',
    workspace: 'Owner workspace',
    project: 'Calendary MVP',
    participants: ['Maya Laurent', 'Nora Admin'],
    description: 'Kickoff client avec revue du planning et des contraintes.',
    attachments: 2,
  },
  {
    id: 'task-1',
    title: 'API booking polish',
    kind: 'TASK',
    dayIndex: 2,
    startsAt: '10:30',
    endsAt: '13:00',
    visibility: 'PUBLIC',
    busy: true,
    color: itemColors[2],
    owner: 'Doni',
    status: 'IN_PROGRESS',
    workspace: 'Owner workspace',
    project: 'Calendary MVP',
    epic: 'Scheduling',
    participants: ['Assistant'],
    description: 'Finaliser les payloads de booking et les cas anti-conflit.',
    attachments: 1,
    publicLabel: 'Public task block',
  },
  {
    id: 'task-2',
    title: 'Attachment QA',
    kind: 'TASK',
    dayIndex: 2,
    startsAt: '11:00',
    endsAt: '12:00',
    visibility: 'PRIVATE',
    busy: true,
    color: itemColors[4],
    owner: 'Assistant',
    status: 'REVIEW',
    workspace: 'Shared workspace',
    project: 'Calendary MVP',
    epic: 'Backend hardening',
    participants: ['Doni'],
    description: 'Tester upload PDF/image et URL signée B2.',
    attachments: 3,
  },
  {
    id: 'project-1',
    title: 'Calendary MVP review',
    kind: 'PROJECT',
    dayIndex: 3,
    startsAt: '14:00',
    endsAt: '17:00',
    visibility: 'PRIVATE',
    busy: true,
    color: itemColors[0],
    owner: 'Doni',
    status: 'ACTIVE',
    workspace: 'Owner workspace',
    project: 'Calendary MVP',
    participants: ['Doni', 'Assistant'],
    description: 'Bloc de revue propriétaire : priorités frontend, permissions et API contracts.',
    attachments: 4,
  },
  {
    id: 'slot-1',
    title: 'Public availability',
    kind: 'EVENT',
    dayIndex: 4,
    startsAt: '16:00',
    endsAt: '16:30',
    visibility: 'PUBLIC',
    busy: false,
    color: itemColors[6],
    owner: 'Doni',
    status: 'AVAILABLE',
    workspace: 'Public calendar',
    participants: [],
    description: 'Créneau libre exposé sur le calendrier public.',
    attachments: 0,
  },
]

export const tasks: TaskItem[] = [
  {
    id: 't-1',
    title: 'Wire task detail page',
    project: 'Calendary MVP',
    epic: 'Frontend shell',
    status: 'TODO',
    priority: 'HIGH',
    estimateMinutes: 120,
    dueAt: 'Today',
    color: itemColors[1],
  },
  {
    id: 't-2',
    title: 'Validate B2 attachment flow',
    project: 'Calendary MVP',
    epic: 'Backend hardening',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    estimateMinutes: 90,
    dueAt: 'Tomorrow',
    color: itemColors[4],
  },
  {
    id: 't-3',
    title: 'Review public calendar masking',
    project: 'Calendary MVP',
    epic: 'Scheduling',
    status: 'REVIEW',
    priority: 'MEDIUM',
    estimateMinutes: 45,
    dueAt: 'Friday',
    color: itemColors[2],
  },
  {
    id: 't-4',
    title: 'Document collaboration contract',
    project: 'Calendary MVP',
    epic: 'Collaboration',
    status: 'DONE',
    priority: 'LOW',
    estimateMinutes: 60,
    dueAt: 'Done',
    color: itemColors[0],
  },
]

export const projects: ProjectItem[] = [
  {
    id: 'p-1',
    title: 'Calendary MVP',
    type: 'PROJECT',
    status: 'ACTIVE',
    progress: 68,
    dueAt: 'Jun 30',
    tasks: 24,
    color: itemColors[0],
  },
  {
    id: 'p-2',
    title: 'Frontend shell',
    type: 'EPIC',
    status: 'ACTIVE',
    progress: 34,
    dueAt: 'Jun 24',
    tasks: 9,
    color: itemColors[1],
  },
  {
    id: 'p-3',
    title: 'Scheduling',
    type: 'EPIC',
    status: 'DONE',
    progress: 100,
    dueAt: 'Jun 21',
    tasks: 7,
    color: itemColors[2],
  },
]

export const bookingRequests: BookingRequest[] = [
  {
    id: 'b-1',
    requester: 'Maya Laurent',
    startsAt: '16:00',
    endsAt: '16:30',
    status: 'PENDING',
  },
  {
    id: 'b-2',
    requester: 'Nora Admin',
    startsAt: 'Friday 11:00',
    endsAt: 'Friday 11:45',
    status: 'ACCEPTED',
  },
]
