import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function TabBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex rounded-md border bg-muted p-1', className)} {...props} />
}

export function TabButton({ className, active, ...props }: TabButtonProps) {
  return (
    <button
      className={cn(
        'h-8 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
        active && 'bg-card text-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
