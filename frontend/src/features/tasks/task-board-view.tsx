import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link, useRouterState } from '@tanstack/react-router'
import { GripVertical, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { useWorkspaceSession } from '../auth/workspace-session'
import { useResourceMutations, useTasksQuery, type TaskResponse } from '../../lib/api'
import type { TaskItem, TaskStatus } from '../../lib/demo-data'

const columnStatuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']

export function TaskBoardView() {
  const { t } = useTranslation()
  const { activeWorkspace, activeWorkspaceId, apiEnabled } = useWorkspaceSession()
  const canWrite = activeWorkspace?.accessLevel !== 'READ'
  const inCollaboratorPortal = useRouterState({ select: (state) => state.location.pathname.startsWith('/collab') })
  const tasksQuery = useTasksQuery(activeWorkspaceId)
  const mutations = useResourceMutations(activeWorkspaceId)
  const visibleTasks = tasksQuery.data?.items.map(toTaskItem) ?? []

  function handleDragEnd(event: DragEndEvent) {
    if (!canWrite) {
      return
    }
    const taskId = String(event.active.id)
    const targetStatus = event.over?.id as TaskStatus | undefined
    if (!targetStatus || !columnStatuses.includes(targetStatus)) {
      return
    }
    const task = visibleTasks.find((item) => item.id === taskId)
    if (!task || task.status === targetStatus) {
      return
    }
    mutations.updateTaskStatus.mutate({ id: taskId, status: targetStatus })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tasks.subtitle')}</p>
        </div>
        {canWrite && (
          inCollaboratorPortal ? (
            <Link to="/collab/tasks/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              {t('tasks.newTask')}
            </Link>
          ) : (
            <Link to="/app/tasks/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus className="h-4 w-4" aria-hidden />
              {t('tasks.newTask')}
            </Link>
          )
        )}
      </div>

      {!apiEnabled && <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{t('tasks.noWorkspace')}</div>}
      {apiEnabled && tasksQuery.isPending && <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">{t('tasks.loading')}</div>}
      {apiEnabled && tasksQuery.isError && (
        <div className="rounded-md border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-foreground">
          {t('tasks.error')}
        </div>
      )}

      {apiEnabled && (
        <DndContext onDragEnd={handleDragEnd}>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {columnStatuses.map((status) => {
              const columnTasks = visibleTasks.filter((task) => task.status === status)
              return <TaskColumn key={status} status={status} label={t(`tasks.columns.${status}`)} tasks={columnTasks} canWrite={canWrite} inCollaboratorPortal={inCollaboratorPortal} />
            })}
          </section>
        </DndContext>
      )}
      {apiEnabled && !visibleTasks.length && !tasksQuery.isPending && (
        <div className="rounded-md border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          {t('tasks.empty')}
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
    <div ref={setNodeRef} className="flex max-h-[calc(100vh-220px)] min-h-[420px] flex-col rounded-lg border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge tone={isOver ? 'default' : 'muted'}>{tasks.length}</Badge>
      </div>
      <div className={isOver ? 'flex-1 overflow-y-auto space-y-3 p-3 ring-2 ring-inset ring-primary/40' : 'flex-1 overflow-y-auto space-y-3 p-3'}>
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
