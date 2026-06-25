export function formatTimeInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }).format(date)
}

// Returns -1 if `date` (rendered in `timezone`) doesn't fall on any of `days` — callers must
// check for that and exclude the item, not clamp it onto day 0: clamping silently mis-files an
// item that's actually outside the visible range (e.g. shifted across a week boundary by the
// display timezone) onto the first day instead of hiding it.
export function dayIndexInTimezone(date: Date, days: Date[], timezone: string) {
  const dateKey = formatDateKeyInTimezone(date, timezone)
  return days.findIndex((day) => formatDateKeyInTimezone(day, timezone) === dateKey)
}

export type DateParts = { year: number; month: number; day: number }

export function datePartsInTimezone(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month) - 1, day: Number(values.day) }
}

// The instant corresponding to 00:00 wall-clock time on the given calendar date, as observed in
// `timezone`. Two passes because the UTC offset itself can depend on the instant (DST) — the
// first pass's offset may land just the wrong side of a transition, so it's corrected once more
// against its own result. This is the same correction `wallTimeToInstant`'s callers below rely on.
export function wallTimeToInstant(parts: DateParts, hour: number, minute: number, timezone: string): Date {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month, parts.day, hour, minute, 0, 0))
  const firstOffset = timezoneOffset(utcGuess, timezone)
  const firstInstant = new Date(utcGuess.getTime() - firstOffset)
  const secondOffset = timezoneOffset(firstInstant, timezone)
  return new Date(utcGuess.getTime() - secondOffset)
}

export function startOfDayInTimezone(date: Date, timezone: string): Date {
  return wallTimeToInstant(datePartsInTimezone(date, timezone), 0, 0, timezone)
}

// Pure calendar-date arithmetic (no wall-clock/DST math involved in the addition itself, only in
// the final conversion back to an instant) — adding 7 calendar days always lands on the same
// weekday regardless of any DST transition crossed along the way.
export function addCalendarDaysInTimezone(date: Date, amount: number, timezone: string): Date {
  const parts = datePartsInTimezone(date, timezone)
  const rolled = new Date(Date.UTC(parts.year, parts.month, parts.day + amount))
  return wallTimeToInstant({ year: rolled.getUTCFullYear(), month: rolled.getUTCMonth(), day: rolled.getUTCDate() }, 0, 0, timezone)
}

export function startOfWeekInTimezone(date: Date, timezone: string): Date {
  const startOfToday = startOfDayInTimezone(date, timezone)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(startOfToday)
  const isoWeekdayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday)
  return addCalendarDaysInTimezone(startOfToday, -Math.max(0, isoWeekdayIndex), timezone)
}

function timezoneOffset(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )
  return asUtc - date.getTime()
}

function formatDateKeyInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
