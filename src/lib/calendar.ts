// "Add to calendar" for the festival: an .ics file (Apple Calendar, Outlook and
// most phones open it straight into the calendar) and a Google Calendar link.
// Built from the shared `events` row, so the date is always the one staff set.
// Same approach as the OHRR website's lib/calendar.ts.
import type { Festival } from './data'

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

function parts(fe: Festival) {
  // No end time set yet: a two-hour block, so it still shows in the calendar.
  const end = fe.endsAt ?? new Date(new Date(fe.startsAt).getTime() + 2 * 3_600_000).toISOString()
  const location = [fe.venue, fe.address].filter(Boolean).join(', ')
  const page = typeof window === 'undefined' ? '' : window.location.origin + '/'
  const details = ['The rabbit festival hosted by Ohio House Rabbit Rescue.', page].filter(Boolean).join('\n\n')
  return { end, location, details, page }
}

export function downloadFestivalIcs(fe: Festival) {
  const p = parts(fe)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohio House Rabbit Rescue//Midwest BunFest//EN',
    'BEGIN:VEVENT',
    `UID:${fe.id}@ohrr`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(fe.startsAt)}`,
    `DTEND:${stamp(p.end)}`,
    `SUMMARY:${esc(fe.title)}`,
    p.location ? `LOCATION:${esc(p.location)}` : '',
    `DESCRIPTION:${esc(p.details)}`,
    p.page ? `URL:${p.page}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${fe.slug || 'midwest-bunfest'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function googleFestivalUrl(fe: Festival): string {
  const p = parts(fe)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: fe.title,
    dates: `${stamp(fe.startsAt)}/${stamp(p.end)}`,
    details: p.details,
    location: p.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
