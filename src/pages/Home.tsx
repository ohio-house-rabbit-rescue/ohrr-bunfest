import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../components/icons'
import { Card, Container, H2, LoadError, Loading, Prose, SmartLink, btn, linkText } from '../components/ui'
import { useFeatures, useFestival, useSessions, useSponsors, type Festival } from '../lib/data'
import { clockOf, daysUntil, longDate } from '../lib/format'
import { OHRR_APP, OHRR_SITE, directionsHref, ext } from '../lib/links'
import { iconOf } from '../lib/icons'

// The five-second test from the design brief: before the artwork, before the
// sponsors, a visitor sees what it is, the date, the place, the price, whether
// they can bring their rabbit, and the ticket. Everything else comes after.

export default function Home() {
  const f = useFestival()
  if (f.error) return <LoadError retry={f.retry} what="the festival details" />
  if (!f.festival) {
    if (f.loading) return <Loading what="Midwest BunFest" />
    return (
      <Container className="py-16 text-center">
        <h1 className="font-display text-3xl font-black text-ink">Midwest BunFest</h1>
        <p className="mt-3 text-lg text-slate-700">The date for the next festival goes up here as soon as OHRR sets it.</p>
      </Container>
    )
  }
  return (
    <>
      <SixAnswers festival={f.festival} over={f.over} />
      <AtTheFestival year={f.festival.year} />
      <Talks year={f.festival.year} />
      <Sponsors />
      {f.festival.body && (
        <Container className="mt-14">
          <H2>{f.festival.theme ? `This year: ${f.festival.theme}` : 'About this year'}</H2>
          <div className="mt-4 max-w-3xl">
            <Prose body={stripDateLine(f.festival.body)} />
          </div>
        </Container>
      )}
      <HandOff />
    </>
  )
}

/** The event text opens with the date and place, which the top of the page already says. */
function stripDateLine(body: string): string {
  const [first, ...rest] = body.replace(/\r\n/g, '\n').split(/\n\s*\n/)
  return /^mark your calendars/i.test(first.trim()) ? rest.join('\n\n') : body
}

function SixAnswers({ festival: fe, over }: { festival: Festival; over: boolean }) {
  const days = daysUntil(fe.startsAt)
  const when = `${longDate(fe.startsAt)}${fe.endsAt ? `, ${clockOf(fe.startsAt)} – ${clockOf(fe.endsAt)}` : `, ${clockOf(fe.startsAt)}`}`
  const place = [fe.venue, fe.address].filter(Boolean).join(', ')
  const { info } = fe

  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-fest-50 to-white">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-4 sm:px-6 md:grid-cols-[1fr_16rem] md:py-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-bold text-fest-dark">
            {over ? (
              <span>This year's festival is over — thank you for coming</span>
            ) : days === 0 ? (
              <span className="rounded-full bg-brand-orange px-3 py-0.5 text-ink">It's today!</span>
            ) : days > 0 ? (
              <span className="rounded-full bg-white px-3 py-0.5 ring-1 ring-fest/30">
                In {days} {days === 1 ? 'day' : 'days'}
              </span>
            ) : null}
            {fe.theme && <span>Theme: {fe.theme}</span>}
          </p>
          <h1 className="mt-1 font-display text-[1.75rem] font-black leading-tight text-ink sm:text-4xl">{fe.title}</h1>
          <p className="mt-1 text-base text-slate-800 sm:text-lg">
            The rabbit festival hosted by Ohio House Rabbit Rescue: talks, rescues, vendors and a silent auction.
          </p>

          <dl className="mt-3 divide-y divide-slate-200 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Answer icon="calendar" label="When">
              {when}
            </Answer>
            <Answer icon="mappin" label="Where">
              {place || 'To be announced'}
              {fe.address && (
                <>
                  {' · '}
                  <a href={directionsHref(place)} {...ext} className={linkText}>
                    Directions
                  </a>
                </>
              )}
            </Answer>
            <Answer icon="ticket" label="Admission">
              {info.admission.length > 0
                ? info.admission.map((a, i) => (
                    <span key={a.who}>
                      {i > 0 && ' · '}
                      {a.who} <strong>{a.price}</strong>
                    </span>
                  ))
                : 'Prices to be announced'}
              {info.admissionNote && <span className="block text-sm text-slate-700">{info.admissionNote}</span>}
            </Answer>
            <Answer icon="heart" label="Your rabbit">
              Welcome, if vaccinated against RHDV2 — bring proof.{' '}
              <Link to="/your-rabbit" className={linkText}>
                What to bring
              </Link>
            </Answer>
          </dl>

          {!over && (
            <div className="mt-3 flex flex-wrap gap-3">
              {info.ticketsUrl && (
                <a href={info.ticketsUrl} {...ext} className={btn.primary}>
                  <Icon name="ticket" size={22} /> Buy tickets
                </a>
              )}
              <Link to="/visit" className={btn.outline}>
                Plan your visit
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <img
            src={fe.imageUrl || '/img/bunfest-2026-logo.png'}
            alt={`${fe.title} logo${fe.theme ? ` — ${fe.theme}` : ''}`}
            className="mx-auto block w-full max-w-[16rem] md:max-w-none"
          />
        </div>
      </div>
    </section>
  )
}

function Answer({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-2.5 sm:items-baseline sm:py-3">
      <Icon name={icon} size={24} className="shrink-0 self-start text-fest-dark sm:mt-0.5" />
      <div className="min-w-0 sm:flex sm:gap-4">
        <dt className="shrink-0 text-base font-bold text-ink sm:w-28">{label}</dt>
        <dd className="text-base text-slate-900">{children}</dd>
      </div>
    </div>
  )
}

function AtTheFestival({ year }: { year: number }) {
  const cards = useFeatures(year)
  if (cards.error) return <LoadError retry={cards.retry} what="what's on" />
  if (!cards.data || cards.data.length === 0) return null
  return (
    <Container className="mt-12">
      <H2>At the festival</H2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.data.map((c) => {
          const inner = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fest-50 text-fest-dark">
                <Icon name={iconOf(c.icon)} size={26} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-extrabold text-ink">{c.title}</span>
                {c.blurb && <span className="mt-1 block text-base text-slate-700">{c.blurb}</span>}
              </span>
            </>
          )
          const cls =
            'flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:bg-brand-blue-50/40'
          return (
            <li key={c.id}>
              {c.link ? (
                <SmartLink to={c.link} className={cls}>
                  {inner}
                </SmartLink>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
    </Container>
  )
}

function Talks({ year }: { year: number }) {
  const s = useSessions(year)
  const talks = (s.data ?? []).filter((x) => x.kind === 'session')
  if (talks.length === 0) return null
  const tracks = [...new Set(talks.map((t) => t.track).filter(Boolean))]
  return (
    <Container className="mt-12">
      <Card className="flex flex-wrap items-center justify-between gap-5 bg-brand-blue-50/50">
        <div className="max-w-2xl">
          <H2>Talks all day</H2>
          <p className="mt-2 text-base text-slate-800">
            {talks.length} talks from rabbit vets and experts
            {tracks.length > 1 ? `, in ${tracks.length} tracks that run at the same time (${tracks.join(' and ')})` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/schedule" className={btn.blue}>
            See the schedule
          </Link>
          <Link to="/speakers" className={btn.outline}>
            The speakers
          </Link>
        </div>
      </Card>
    </Container>
  )
}

function Sponsors() {
  const s = useSponsors()
  const list = s.data ?? []
  if (list.length === 0) return null
  const lead = list.filter((x) => x.tier === 'presenting')
  const rest = list.filter((x) => x.tier !== 'presenting')
  return (
    <Container className="mt-12">
      <H2>Thank you to our sponsors</H2>
      {lead.map((x) => (
        <p key={x.id} className="mt-3 text-lg text-slate-800">
          Lead sponsor: <strong className="text-ink">{x.name}</strong>
        </p>
      ))}
      {rest.length > 0 && <p className="mt-2 text-base text-slate-700">{rest.map((x) => x.name).join(' · ')}</p>}
      <Link to="/sponsors" className={`${linkText} mt-3 inline-block py-1`}>
        About our sponsors
      </Link>
    </Container>
  )
}

function HandOff() {
  const doors: { href: string; icon: IconName; h: string; p: string }[] = [
    { href: `${OHRR_SITE}/adopt`, icon: 'heart', h: 'Adopt a rabbit', p: "Meet the rabbits waiting at OHRR's adoption center in Columbus." },
    { href: `${OHRR_SITE}/volunteer`, icon: 'users', h: 'Volunteer', p: 'Socialize rabbits, help with care, or lend a hand at events.' },
    { href: `${OHRR_SITE}/give`, icon: 'gift', h: 'Give', p: 'Help OHRR care for rabbits all year, not just on festival day.' },
    { href: OHRR_APP, icon: 'device', h: 'The OHRR app', p: 'Rabbit care answers, vets, events and your own bunny’s reminders.' },
  ]
  return (
    <Container className="mt-14">
      <H2>After BunFest: Ohio House Rabbit Rescue</H2>
      <p className="mt-2 max-w-3xl text-base text-slate-700">
        The raffle, the silent auction, the Bunny Spa and the Hop Shop all raise money for OHRR, the rescue that hosts BunFest.
        Here's how to stay involved.
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {doors.map((d) => (
          <li key={d.h}>
            <a
              href={d.href}
              {...ext}
              className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:bg-brand-blue-50/40"
            >
              <Icon name={d.icon} size={28} className="text-brand-blue" />
              <span className="font-display text-lg font-extrabold text-ink">{d.h}</span>
              <span className="text-base text-slate-700">{d.p}</span>
            </a>
          </li>
        ))}
      </ul>
    </Container>
  )
}
