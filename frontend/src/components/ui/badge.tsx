import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeTone = 'default' | 'event' | 'task' | 'project' | 'success' | 'danger' | 'muted'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium',
        tone === 'default' && 'border-primary/30 bg-primary/10 text-foreground',
        tone === 'event' && 'border-event/30 bg-event/10 text-foreground',
        tone === 'task' && 'border-task/30 bg-task/10 text-foreground',
        tone === 'project' && 'border-project/30 bg-project/10 text-foreground',
        tone === 'success' && 'border-available/30 bg-available/10 text-foreground',
        tone === 'danger' && 'border-busy/30 bg-busy/10 text-foreground',
        tone === 'muted' && 'border-border bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
