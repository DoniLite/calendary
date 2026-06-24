import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled,
  clearable = true,
  className,
}: {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate text-left', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && (
            <X
              className="h-4 w-4 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation()
                onChange(undefined)
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value === value ? undefined : option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('h-4 w-4 shrink-0', option.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className="min-w-0 truncate">
                    {option.label}
                    {option.description && <span className="ml-1 text-muted-foreground">{option.description}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function MultiCombobox({
  options,
  values,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled,
  className,
}: {
  options: ComboboxOption[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.filter((option) => values.includes(option.value))

  function toggle(optionValue: string) {
    onChange(values.includes(optionValue) ? values.filter((value) => value !== optionValue) : [...values, optionValue])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {selected.length ? (
          <span className="flex min-w-0 flex-wrap gap-1">
            {selected.map((option) => (
              <span key={option.value} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                {option.label}
                <X
                  className="h-3 w-3 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggle(option.value)
                  }}
                />
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = values.includes(option.value)
                return (
                  <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => toggle(option.value)}>
                    <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
