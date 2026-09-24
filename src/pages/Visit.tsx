import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Card, Chip, Container, H2, LoadError, Loading, PageTitle, PrintButton, Rule, btn, linkText } from '../components/ui'
import { useFestival, usePages } from '../lib/data'
import { clockOf, longDate } from '../lib/format'
import { directionsHref, ext } from '../lib/links'
import { downloadFestivalIcs, googleFestivalUrl } from '../lib/calendar'

// Everything Alan needs the week before, on one printable page: the day, the
// address and directions, parking, the prices, the tickets, the rabbit rule
// and where to stay.
export default function Visit() {
  const f = useFestival()
  const fe = f.festival
  const pages = usePages(fe?.year)
  if (f.error) return <LoadError retry={f.retry} what="the visit details" />
  if (!fe) return <Loading />

  const place = [fe.venue, fe.address].filter(Boolean).join(', ')
  const hotel = pages.data?.find((p) => p.slug === 'accommodations')
  const { info } = fe

  return (
    <>
      <PageTitle
        title="Plan your visit"
        icon="mappin"
        intro="The day, the place, what it costs and what to bring — everything on one page you can print."
      />
      <Container className="print-urls mt-8 space-y-8">
        <div className="no-print">
          <PrintButton label="Print this page" />
        </div>

        <section className="print-break-inside-avoid">
          <H2>When and where</H2>
          <Card className="mt-4 space-y-3">
            <p className="flex gap-3 text-lg">
              <Icon name="calendar" size={26} className="mt-0.5 shrink-0 text-fest-dark" />
              <span>
                <strong>{longDate(fe.startsAt)}</strong>
                <br />
                {clockOf(fe.startsAt)}
                {fe.endsAt ? ` – ${clockOf(fe.endsAt)}` : ''}
                <span className="no-print mt-1 block text-base">
                  <button type="button" onClick={() => downloadFestivalIcs(fe)} className={linkText}>
                    Add to calendar
                  </button>
                  {' · '}
                  <a href={googleFestivalUrl(fe)} {...ext} className={linkText}>
                    Google Calendar
                  </a>
                </span>
              </span>
            </p>
            {place && (
              <p className="flex gap-3 text-lg">
                <Icon name="mappin" size={26} className="mt-0.5 shrink-0 text-fest-dark" />
                <span>
                  <strong>{fe.venue}</strong>
                  {fe.address && (
                    <>
                      <br />
                      {fe.address}
                    </>
                  )}
                </span>
              </p>
            )}
            {info.parking && (
              <p className="flex gap-3 text-lg">
                <Icon name="info" size={26} className="mt-0.5 shrink-0 text-fest-dark" />
                <span>
                  <strong>Parking:</strong> {info.parking}
                </span>
              </p>
            )}
            {fe.address && (
              <a href={directionsHref(place)} {...ext} className={`${btn.blue} no-print`}>
                <Icon name="mappin" size={20} /> Get directions
              </a>
            )}
          </Card>
        </section>

        <section className="print-break-inside-avoid">
          <H2>Admission</H2>
          <Card className="mt-4">
            {info.admission.length > 0 ? (
              <table className="w-full max-w-md text-left text-lg">
                <caption className="sr-only">Admission prices</caption>
                <tbody>
                  {info.admission.map((a) => (
                    <tr key={a.who} className="border-b border-slate-200 last:border-b-0">
                      <th scope="row" className="py-2 pr-4 font-semibold text-ink">
                        {a.who}
                      </th>
                      <td className="py-2 font-bold text-ink">{a.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-lg">Prices are announced closer to the festival.</p>
            )}
            {info.admissionNote && <p className="mt-3 text-base text-slate-700">{info.admissionNote}</p>}
            {info.ticketsUrl && !f.over && (
              <a href={info.ticketsUrl} {...ext} className={`${btn.primary} no-print mt-4`}>
                <Icon name="ticket" size={22} /> Buy tickets
              </a>
            )}
            <p className="mt-4 text-base text-slate-700">
              Volunteers get in free.{' '}
              <Link to="/volunteer" className={linkText}>
                Volunteer at BunFest
              </Link>
            </p>
          </Card>
        </section>

        <section className="print-break-inside-avoid">
          <H2>Bringing your rabbit</H2>
          <Rule className="mt-4">
            <p>
              {info.rabbitRule ??
                'Any rabbit attending must be vaccinated against RHDV2, with proof of vaccination or an annual booster.'}
            </p>
            <Link to="/your-rabbit" className={`${linkText} no-print mt-2 inline-block`}>
              What counts as proof, and the attendance agreement
            </Link>
          </Rule>
        </section>

        {hotel && (
          <section className="print-break-inside-avoid">
            <H2>Staying overnight</H2>
            <Card className="mt-4">
              <p className="text-lg">{hotel.subtitle}</p>
              {hotel.chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {hotel.chips.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              )}
              <Link to="/festival/accommodations" className={`${btn.outline} no-print mt-4`}>
                The host hotel and group rate
              </Link>
            </Card>
          </section>
        )}

        <section className="no-print">
          <H2>On the day</H2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/schedule" className={btn.outline}>
              Talks & schedule
            </Link>
            <Link to="/map" className={btn.outline}>
              Map of the rooms
            </Link>
            <Link to="/festival" className={btn.outline}>
              Everything at the festival
            </Link>
            {info.merchUrl && (
              <a href={info.merchUrl} {...ext} className={btn.outline}>
                BunFest shirts and merchandise
              </a>
            )}
          </div>
        </section>
      </Container>
    </>
  )
}
