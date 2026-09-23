import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, LoadError, Loading, Note, PageTitle, PrintButton, linkText } from '../components/ui'
import { presenterName, usePresenters, useSessions, useShownYear, type Session } from '../lib/data'
import { timeRange } from '../lib/format'
import { PastYearNote, YearPicker } from '../components/YearPicker'

// The talks, in time order, with each one's track. The festival runs two
// tracks at once, so a visitor can narrow it to one — with a plain button,
// not a hidden menu — or print the whole day.
export default function Schedule() {
  const { year, current, isPast } = useShownYear()
  const sessions = useSessions(year)
  const presenters = usePresenters()
  const [track, setTrack] = useState<string>('')

  const tracks = useMemo(
    () => [...new Set((sessions.data ?? []).map((s) => s.track).filter(Boolean))],
    [sessions.data],
  )
  const shown = (sessions.data ?? []).filter((s) => !track || s.track === track)
  const byId = new Map((presenters.data ?? []).map((p) => [p.id, p]))

  return (
    <>
      <PageTitle
        title={isPast ? `Talks & schedule, ${year}` : 'Talks & schedule'}
        icon="book"
        intro="Talks from rabbit vets and experts through the day. Times are for the day of the festival."
      >
        <YearPicker current={current} />
      </PageTitle>
      <Container className="mt-8">
        {isPast && <PastYearNote year={year!} />}
        {sessions.error ? (
          <LoadError retry={sessions.retry} what="the schedule" />
        ) : sessions.loading ? (
          <Loading what="the schedule" />
        ) : shown.length === 0 && !track ? (
          <Note>The {year} talks are announced closer to the festival.</Note>
        ) : (
          <>
            <div className="no-print flex flex-wrap items-center gap-3">
              {tracks.length > 1 && (
                <div role="group" aria-label="Which talks to show" className="flex flex-wrap gap-2">
                  {['', ...tracks].map((t) => (
                    <button
                      key={t || 'all'}
                      type="button"
                      aria-pressed={track === t}
                      onClick={() => setTrack(t)}
                      className={`min-h-12 rounded-full border-2 px-4 text-base font-bold transition ${
                        track === t ? 'border-fest-dark bg-fest-dark text-white' : 'border-slate-300 bg-white text-ink hover:border-fest'
                      }`}
                    >
                      {t || 'All talks'}
                    </button>
                  ))}
                </div>
              )}
              <PrintButton label="Print the schedule" />
            </div>

            <ol className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {shown.map((s) => (
                <Row key={s.id} s={s} showTrack={tracks.length > 1 && !track} presenters={s.presenterIds.map((id) => byId.get(id)).filter((p) => !!p)} />
              ))}
            </ol>
            <p className="no-print mt-6 text-base">
              <Link to="/speakers" className={linkText}>
                About the speakers
              </Link>
            </p>
          </>
        )}
      </Container>
    </>
  )
}

function Row({
  s,
  showTrack,
  presenters,
}: {
  s: Session
  showTrack: boolean
  presenters: { id: string; name: string; credentials: string | null }[]
}) {
  const when = timeRange(s.start, s.end)
  if (s.kind === 'break') {
    return (
      <li className="print-break-inside-avoid flex flex-wrap gap-x-6 gap-y-1 bg-slate-50 px-4 py-3 text-base text-slate-700 sm:px-6">
        <span className="w-44 shrink-0 font-bold">{when}</span>
        <span>
          {s.title}
          {showTrack && s.track ? ` · ${s.track}` : ''}
        </span>
      </li>
    )
  }
  return (
    <li className="print-break-inside-avoid flex flex-col gap-1 px-4 py-5 sm:flex-row sm:gap-6 sm:px-6">
      <div className="w-44 shrink-0">
        <p className="text-lg font-bold text-ink">{when}</p>
        {showTrack && s.track && <p className="text-sm font-semibold text-fest-dark">{s.track}</p>}
        {s.room && <p className="text-sm text-slate-700">{s.room}</p>}
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-extrabold text-ink">{s.title}</h2>
        {presenters.length > 0 ? (
          <p className="mt-1 text-base font-semibold text-slate-800">
            {presenters.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === presenters.length - 1 ? ' and ' : ', ')}
                <Link to={`/speakers#${p.id}`} className={linkText}>
                  {presenterName(p)}
                </Link>
              </span>
            ))}
          </p>
        ) : (
          s.presenter && <p className="mt-1 text-base font-semibold text-slate-800">{s.presenter}</p>
        )}
        {s.description && <p className="mt-2 text-base text-slate-700">{s.description}</p>}
      </div>
    </li>
  )
}
