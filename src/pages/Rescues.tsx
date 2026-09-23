import { Link } from 'react-router-dom'
import { Card, Chip, Container, LoadError, Loading, Note, PageTitle, WebLink, linkText } from '../components/ui'
import { PastYearNote, YearPicker } from '../components/YearPicker'
import { cameIn, useFloor, useRescues, useShownYear, type Rescue } from '../lib/data'
import { formatNumbers } from '../lib/floor'
import { OHRR_SITE, directionsHref, ext, telHref } from '../lib/links'

// The rescue groups coming to BunFest, and how to reach each one — the
// contact details each rescue publishes itself, as tappable text.
export default function Rescues() {
  const { year, current, isPast } = useShownYear()
  const rescues = useRescues()
  const floor = useFloor(isPast ? undefined : year)
  const list = year ? (rescues.data ?? []).filter((r) => cameIn(r, year, current)) : []
  const host = list.filter((r) => r.isHost)
  const others = list.filter((r) => !r.isHost)

  return (
    <>
      <PageTitle
        title={isPast ? `Rescue partners, ${year}` : 'Rescue partners'}
        icon="heart"
        intro="Rabbit rescues and humane societies from across the region."
      >
        <YearPicker current={current} />
      </PageTitle>
      <Container className="mt-8">
        {isPast && <PastYearNote year={year!} />}
        {rescues.error ? (
          <LoadError retry={rescues.retry} what="the rescues" />
        ) : rescues.loading || !year ? (
          <Loading what="the rescues" />
        ) : list.length === 0 ? (
          <Note>The {year} rescue partners are announced closer to the festival.</Note>
        ) : (
          <>
            <p className="text-lg text-slate-800">
              {list.length} rescues{states(list)}.
            </p>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {[...host, ...others].map((r) => (
                <li key={r.id} className="print-break-inside-avoid">
                  <RescueCard r={r} tables={floor.data?.placeOf('rescue', r.id).numbers ?? []} />
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-8 text-base">
          Looking for a rescue near you, all year round?{' '}
          <a href={`${OHRR_SITE}/partners`} {...ext} className={linkText}>
            OHRR's directory of rescue partners
          </a>
        </p>
      </Container>
    </>
  )
}

function states(list: Rescue[]): string {
  // Only when every rescue has its state filled in — never a guessed count.
  if (list.some((r) => !r.state)) return ''
  const s = new Set(list.map((r) => r.state))
  return s.size > 1 ? ` from ${s.size} states` : ''
}

function RescueCard({ r, tables }: { r: Rescue; tables: number[] }) {
  const where = r.location ?? [r.city, r.state].filter(Boolean).join(', ')
  return (
    <Card className="h-full">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-extrabold text-ink">{r.name}</h2>
        {r.isHost && <Chip tone="orange">Host</Chip>}
      </div>
      {where && <p className="text-base font-semibold text-slate-700">{where}</p>}
      {r.blurb && <p className="mt-2 text-base text-slate-800">{r.blurb}</p>}
      <ul className="mt-3 space-y-1 text-base">
        {r.email && (
          <li>
            <a href={`mailto:${r.email}`} className={`${linkText} break-all`}>
              {r.email}
            </a>
          </li>
        )}
        {/* OHRR's own number is on its About page only (email is the way in); other rescues' are theirs to publish. */}
        {r.phone && !r.isHost && (
          <li>
            <a href={telHref(r.phone)} className={linkText}>
              {r.phone}
            </a>
          </li>
        )}
        {r.address && (
          <li>
            <a href={directionsHref(r.address)} {...ext} className={linkText}>
              {r.address}
            </a>
          </li>
        )}
        {r.website && (
          <li>
            <WebLink url={r.website} />
          </li>
        )}
        {tables.length > 0 && (
          <li>
            <Link to={`/map?table=${tables[0]}`} className={linkText}>
              {tables.length > 1 ? 'Tables' : 'Table'} {formatNumbers(tables)} on the map
            </Link>
          </li>
        )}
      </ul>
    </Card>
  )
}
