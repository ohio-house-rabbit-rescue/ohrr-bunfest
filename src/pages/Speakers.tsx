import { Link } from 'react-router-dom'
import { Card, Container, Initial, LoadError, Loading, Note, PageTitle, WebLink, linkText } from '../components/ui'
import { presenterName, usePresenters, useSessions, useShownYear } from '../lib/data'
import { timeRange } from '../lib/format'

// Who gives the talks — name, credentials, where they work and a short bio,
// entered by OHRR once (Staff → BunFest → Speakers) and linked to each talk.
export default function Speakers() {
  const { year } = useShownYear()
  const people = usePresenters()
  const sessions = useSessions(year)

  return (
    <>
      <PageTitle
        title="Speakers"
        icon="users"
        crumbs={[{ to: '/schedule', label: 'Talks & schedule' }]}
        intro="The vets and rabbit experts giving this year's talks."
      />
      <Container className="mt-8">
        {people.error ? (
          <LoadError retry={people.retry} what="the speakers" />
        ) : people.loading ? (
          <Loading what="the speakers" />
        ) : (people.data ?? []).length === 0 ? (
          <Note>The speakers are announced with the schedule.</Note>
        ) : (
          <ul className="space-y-5">
            {people.data!.map((p) => {
              const talks = (sessions.data ?? []).filter((s) => s.presenterIds.includes(p.id))
              return (
                <li key={p.id} id={p.id} className="scroll-mt-24">
                  <Card className="flex flex-col gap-4 sm:flex-row">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} loading="lazy" className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <Initial name={p.name} className="h-20 w-20 text-3xl" />
                    )}
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl font-black text-ink">{presenterName(p)}</h2>
                      {p.affiliation && <p className="text-base font-semibold text-slate-700">{p.affiliation}</p>}
                      {p.bio && <p className="mt-3 text-base text-slate-800">{p.bio}</p>}
                      {p.website && (
                        <p className="mt-2 text-base">
                          <WebLink url={p.website} />
                        </p>
                      )}
                      {talks.length > 0 && (
                        <div className="mt-4 rounded-xl bg-fest-50 p-4">
                          <h3 className="text-sm font-bold uppercase tracking-wide text-fest-dark">
                            {talks.length === 1 ? 'Their talk' : 'Their talks'}
                          </h3>
                          <ul className="mt-1 space-y-1">
                            {talks.map((t) => (
                              <li key={t.id} className="text-base">
                                <strong>{timeRange(t.start, t.end)}</strong> — {t.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-6 text-base">
          <Link to="/schedule" className={linkText}>
            Back to the schedule
          </Link>
        </p>
      </Container>
    </>
  )
}
