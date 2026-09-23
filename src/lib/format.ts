// Dates and times as people say them, always in Ohio's time zone — a visitor
// reading this in another state still sees the festival's own clock.
const TZ = 'America/New_York'

/** "Sunday, October 25, 2026" */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: TZ,
  })
}

/** "October 25, 2026" */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ })
}

/** "10 AM" / "12:30 PM" */
export function clockOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
    .replace(':00', '')
}

/** The festival's year, in Ohio. */
export function yearOf(iso: string): number {
  return Number(new Date(iso).toLocaleDateString('en-US', { year: 'numeric', timeZone: TZ }))
}

/** "13:30:00" → "1:30 PM" (a session's time of day). */
export function clock(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h)) return t
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

/** "10:30 – 11:15 AM" (the AM/PM is said once when both match). */
export function timeRange(start: string, end: string | null): string {
  const a = clock(start)
  if (!end) return a
  const b = clock(end)
  const sameHalf = a.slice(-2) === b.slice(-2)
  return `${sameHalf ? a.slice(0, -3) : a} – ${b}`
}

/** Whole days from now until a date (0 on the day, negative after). */
export function daysUntil(iso: string, now = new Date()): number {
  const day = (d: Date) =>
    Date.UTC(
      ...(d
        .toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: TZ })
        .split('/')
        .map(Number)
        .reduce<[number, number, number]>((acc, n, i) => {
          if (i === 0) acc[1] = n - 1
          else if (i === 1) acc[2] = n
          else acc[0] = n
          return acc
        }, [0, 0, 0]) as [number, number, number]),
    )
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000)
}

export function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}
