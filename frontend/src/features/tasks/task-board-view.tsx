import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { tasks as initialTasks, type TaskItem, type TaskStatus } from '../../lib/demo-data'

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: 'BACKLOG', label: 'Backlog' },
  { status: 'TODO', label: 'Todo' },
  { status: 'IN_PROGRESS', label: 'Progress' },
  { status: 'REVIEW', label: 'Review' },
  { status: 'DONE', label: 'Done' },
]

export function TaskBoardView() {
  const [tasks, setTasks] = useState(initialTasks)

  function handleDragEnd(event: DragEndEvent) {
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
          <p className="text-sm text-muted-foreground">Drag tasks between statuses to update the kanban flow.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" aria-hidden />
          Task
        </Button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <section className="grid gap-4 xl:grid-cols-5">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status)
            return <TaskColumn key={column.status} status={column.status} label={column.label} tasks={columnTasks} />
          })}
        </section>
      </DndContext>
    </div>
  )
}

function TaskColumn({ status, label, tasks }: { status: TaskStatus; label: string; tasks: TaskItem[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className="min-h-[420px] rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge tone={isOver ? 'default' : 'muted'}>{tasks.length}</Badge>
      </div>
      <div className={isOver ? 'space-y-3 p-3 ring-2 ring-inset ring-primary/40' : 'space-y-3 p-3'}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: TaskItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
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
          className="mt-0.5 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Drag ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-5">{task.title}</div>
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
