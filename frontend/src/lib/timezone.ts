export const DEFAULT_SOURCE_TIMEZONE = 'Europe/Paris'

type TimedCalendarItem = {
  dayIndex: number
  startsAt: string
  endsAt: string
}

export function convertWallClockRange<T extends TimedCalendarItem>(item: T, days: Date[], targetTimezone: string, sourceTimezone = DEFAULT_SOURCE_TIMEZONE): T {
  if (targetTimezone === sourceTimezone) {
    return item
  }

  const sourceDay = days[item.dayIndex] ?? days[0] ?? new Date()
  const startsAt = zonedWallTimeToInstant(sourceDay, item.startsAt, sourceTimezone)
  const endsAt = zonedWallTimeToInstant(sourceDay, item.endsAt, sourceTimezone)

  return {
    ...item,
    dayIndex: dayIndexInTimezone(startsAt, days, targetTimezone),
    startsAt: formatTimeInTimezone(startsAt, targetTimezone),
    endsAt: formatTimeInTimezone(endsAt, targetTimezone),
  }
}

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

function zonedWallTimeToInstant(day: Date, time: string, timezone: string) {
  const [hours = '0', minutes = '0'] = time.split(':')
  const utcGuess = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), Number(hours), Number(minutes), 0, 0))
  const firstOffset = timezoneOffset(utcGuess, timezone)
  const firstInstant = new Date(utcGuess.getTime() - firstOffset)
  const secondOffset = timezoneOffset(firstInstant, timezone)
  return new Date(utcGuess.getTime() - secondOffset)
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
