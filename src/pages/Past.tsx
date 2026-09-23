import { Link } from 'react-router-dom'
import { Card, Container, LoadError, Loading, Note, PageTitle, linkText } from '../components/ui'
import { useArchiveYears, useFestival } from '../lib/data'
import { OFFICIAL_SITE, ext } from '../lib/links'

// Every year kept, not overwritten: when OHRR starts a new year (Staff →
// BunFest → This year → Start a new year), last year's programme, vendors,
// rescues and pages stay here as a record — the reason to trust the event,
// and a vendor's evidence that a table is worth taking.
export default function Past() {
  const f = useFestival()
  const years = useArchiveYears()
  const current = f.festival?.year
  const past = (years.data ?? []).filter((y) => current !== undefined && y < current)

  return (
    <>
      <PageTitle title="Past years" icon="calendar" intro="Each year's talks, vendors and rescues, kept for the record." />
      <Container className="mt-8 space-y-6">
        {years.error ? (
          <LoadError retry={years.retry} what="the past years" />
        ) : years.loading || f.loading ? (
          <Loading what="the past years" />
        ) : past.length === 0 ? (
          <Note>
            {current ? `${current} is the first year kept here. ` : ''}From next year, each festival's talks, vendors and rescues
            stay on this page when the new year goes up. Earlier years are on{' '}
            <a href={OFFICIAL_SITE} {...ext} className={linkText}>
              midwestbunfest.org
            </a>
            .
          </Note>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {past.map((y) => (
              <li key={y}>
                <Card>
                  <h2 className="font-display text-2xl font-black text-ink">Midwest BunFest {y}</h2>
                  <ul className="mt-3 space-y-1 text-base">
                    <li>
                      <Link to={`/schedule?year=${y}`} className={`${linkText} inline-block py-1`}>
                        Talks & schedule
                      </Link>
                    </li>
                    <li>
                      <Link to={`/vendors?year=${y}`} className={`${linkText} inline-block py-1`}>
                        Vendors
                      </Link>
                    </li>
                    <li>
                      <Link to={`/rescues?year=${y}`} className={`${linkText} inline-block py-1`}>
                        Rescue partners
                      </Link>
                    </li>
                    <li>
                      <Link to={`/festival?year=${y}`} className={`${linkText} inline-block py-1`}>
                        At the festival
                      </Link>
                    </li>
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  )
}
