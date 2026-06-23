import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link, useRouterState } from '@tanstack/react-router'
import { GripVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useTasksQuery, type TaskResponse } from '../../lib/api'
import { tasks as initialTasks, type TaskItem, type TaskStatus } from '../../lib/demo-data'

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: 'BACKLOG', label: 'Backlog' },
  { status: 'TODO', label: 'Todo' },
  { status: 'IN_PROGRESS', label: 'Progress' },
  { status: 'REVIEW', label: 'Review' },
  { status: 'DONE', label: 'Done' },
]

export function TaskBoardView() {
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = useRouterState({ select: (state) => state.location.pathname.startsWith('/collab') })
  const tasksQuery = useTasksQuery(activeWorkspaceId)
  const [tasks, setTasks] = useState(initialTasks)
  const visibleTasks = apiEnabled && tasksQuery.data ? tasksQuery.data.items.map(toTaskItem) : tasks

  function handleDragEnd(event: DragEndEvent) {
    if (apiEnabled || !canWrite) {
      return
    }
    const taskId = String(event.active.id)
    const targetStatus = event.over?.id as TaskStatus | undefined
    if (!targetStatus || !columns.some((column) => column.status === targetStatus)) {
      return
    }
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: targetStatus } : task)))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {apiEnabled ? 'Workspace tasks loaded from Calendary API.' : 'Drag tasks between statuses to update the kanban flow.'}
          </p>
        </div>
        {canWrite && (
          inCollaboratorPortal ? (
            <Link to="/collab/tasks/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              Task
            </Link>
          ) : (
            <Link to="/app/tasks/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              Task
            </Link>
          )
        )}
      </div>

      {apiEnabled && tasksQuery.isPending && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">Loading tasks from backend...</div>}
      {apiEnabled && tasksQuery.isError && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          Unable to load backend tasks. Check your session and workspace id.
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <section className="grid gap-4 xl:grid-cols-5">
          {columns.map((column) => {
            const columnTasks = visibleTasks.filter((task) => task.status === column.status)
            return <TaskColumn key={column.status} status={column.status} label={column.label} tasks={columnTasks} canWrite={canWrite} inCollaboratorPortal={inCollaboratorPortal} />
          })}
        </section>
      </DndContext>
      {!visibleTasks.length && !tasksQuery.isPending && (
        <div className="rounded-md border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No tasks in this workspace yet.
        </div>
      )}
    </div>
  )
}

function toTaskItem(task: TaskResponse): TaskItem {
  return {
    id: task.id,
    title: task.title,
    project: task.projectId ?? 'No project',
    epic: task.epicId ?? 'No epic',
    status: task.status,
    priority: task.priority,
    estimateMinutes: task.estimateMinutes ?? 0,
    dueAt: task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No due date',
    color: {
      name: task.color.preset,
      background: task.color.background,
      foreground: task.color.foreground,
      border: task.color.border,
    },
  }
}

function TaskColumn({ status, label, tasks, canWrite, inCollaboratorPortal }: { status: TaskStatus; label: string; tasks: TaskItem[]; canWrite: boolean; inCollaboratorPortal: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className="min-h-[420px] rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge tone={isOver ? 'default' : 'muted'}>{tasks.length}</Badge>
      </div>
      <div className={isOver ? 'space-y-3 p-3 ring-2 ring-inset ring-primary/40' : 'space-y-3 p-3'}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} canWrite={canWrite} inCollaboratorPortal={inCollaboratorPortal} />
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task, canWrite, inCollaboratorPortal }: { task: TaskItem; canWrite: boolean; inCollaboratorPortal: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !canWrite })
  return (
    <article
      ref={setNodeRef}
      className="rounded-md border bg-background p-3 shadow-sm"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.65 : 1,
        borderColor: task.color.border,
      }}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Drag ${task.title}`}
          disabled={!canWrite}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          {inCollaboratorPortal ? (
            <Link to="/collab/tasks/$taskId" params={{ taskId: task.id }} className="font-medium leading-5 hover:underline">
              {task.title}
            </Link>
          ) : (
            <Link to="/app/tasks/$taskId" params={{ taskId: task.id }} className="font-medium leading-5 hover:underline">
              {task.title}
            </Link>
          )}
          <div className="mt-2 text-xs text-muted-foreground">{task.project}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium"
              style={{ backgroundColor: task.color.background, color: task.color.foreground, borderColor: task.color.border }}
            >
              {task.epic}
            </span>
            <Badge tone={task.priority === 'URGENT' ? 'danger' : 'task'}>{task.priority}</Badge>
            <Badge tone="muted">{task.estimateMinutes}m</Badge>
            <Badge tone="muted">{task.dueAt}</Badge>
          </div>
        </div>
      </div>
    </article>
  )
}
