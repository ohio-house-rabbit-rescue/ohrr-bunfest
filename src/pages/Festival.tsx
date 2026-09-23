import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/icons'
import {
  Card,
  Chip,
  Container,
  LoadError,
  Loading,
  Note,
  PageTitle,
  PrintButton,
  Rule,
  RowLink,
  SmartLink,
  btn,
  linkText,
} from '../components/ui'
import { PastYearNote, YearPicker } from '../components/YearPicker'
import { useAuction, useFeatures, useFestival, usePages, useShownYear, type FestivalPage } from '../lib/data'
import { destOf, directionsHref, ext, telHref } from '../lib/links'
import { iconOf } from '../lib/icons'

/** Where each festival page opens — its own page here, or /festival/<slug>. */
function pageHref(p: FestivalPage, year: number | undefined, current: number | undefined): string {
  const d = destOf(`/bunfest/p/${p.slug}`)
  const to = 'to' in d ? d.to : `/festival/${p.slug}`
  return year && year !== current ? `${to}${to.includes('?') ? '&' : '?'}year=${year}` : to
}

// Everything at the festival: the activity pages OHRR edits per year (Bunny
// Spa, Glamour Shots, the raffle, the lounge, the hotel …).
export function FestivalList() {
  const { year, current, isPast } = useShownYear()
  const pages = usePages(year)
  const cards = useFeatures(year)

  // A card's short description, where the page has one.
  const blurbFor = (slug: string) =>
    cards.data?.find((c) => c.link === `/bunfest/p/${slug}`)?.blurb ?? null

  return (
    <>
      <PageTitle
        title={isPast ? `At the festival, ${year}` : 'At the festival'}
        icon="sparkles"
        intro="What's on through the day, and what each thing costs."
      >
        <YearPicker current={current} />
      </PageTitle>
      <Container className="mt-8">
        {isPast && <PastYearNote year={year!} />}
        {pages.error ? (
          <LoadError retry={pages.retry} what="the festival pages" />
        ) : pages.loading ? (
          <Loading />
        ) : (pages.data ?? []).length === 0 ? (
          <Note>The {year} details are announced closer to the festival.</Note>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {pages.data!.map((p) => (
              <li key={p.id}>
                <Link
                  to={pageHref(p, year, current)}
                  className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:bg-brand-blue-50/40"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fest-50 text-fest-dark">
                    <Icon name={iconOf(p.icon)} size={26} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-extrabold text-ink">{p.title}</span>
                    <span className="mt-1 block text-base text-slate-700">{blurbFor(p.slug) ?? p.subtitle}</span>
                    {p.chips.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-2">
                        {p.chips.map((c) => (
                          <Chip key={c}>{c}</Chip>
                        ))}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!isPast && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <RowLink to="/auction">Silent auction items</RowLink>
            <RowLink to="/schedule">Talks & schedule</RowLink>
          </div>
        )}
      </Container>
    </>
  )
}

/** One festival page, read from the database for the year being shown. */
export function FestivalPageView({ slug: fixed, extra }: { slug?: string; extra?: ReactNode }) {
  const params = useParams()
  const slug = fixed ?? params.slug
  const { year, isPast } = useShownYear()
  const f = useFestival()
  const pages = usePages(year)
  const page = pages.data?.find((p) => p.slug === slug)
  const auction = useAuction(page?.feature === 'raffle' ? f.festival?.slug : undefined)

  if (pages.error) return <LoadError retry={pages.retry} what="this page" />
  if (pages.loading) return <Loading />
  if (!page) {
    return (
      <>
        <PageTitle title="Page not found" crumbs={[{ to: '/festival', label: 'At the festival' }]} />
        <Container className="mt-8">
          <Note>
            There's no page by that name for {year}.{' '}
            <Link to="/festival" className={linkText}>
              See everything at the festival
            </Link>
          </Note>
        </Container>
      </>
    )
  }

  const raffleDetails = auction.data?.settings.raffleDetails
  const c = page.contact

  return (
    <>
      <PageTitle
        title={page.title}
        icon={iconOf(page.icon)}
        crumbs={[{ to: '/festival', label: 'At the festival' }]}
        intro={page.subtitle}
      >
        {(page.sponsorNote || page.chips.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {page.sponsorNote && <Chip tone="orange">{page.sponsorNote}</Chip>}
            {page.chips.map((x) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        )}
      </PageTitle>
      <Container className="print-urls mt-8 space-y-5">
        {isPast && <PastYearNote year={year!} />}
        <div className="no-print">
          <PrintButton />
        </div>
        {page.note && (
          <Rule>
            <p className="font-semibold">{page.note}</p>
          </Rule>
        )}

        {page.sections.map((s, i) => (
          <Card key={i} className="print-break-inside-avoid">
            {s.heading && <h2 className="font-display text-xl font-extrabold text-ink">{s.heading}</h2>}
            {s.body && <p className={`text-base text-slate-800 ${s.heading ? 'mt-2' : ''}`}>{s.body}</p>}
            {s.list && (
              <ul className={`list-disc space-y-1.5 pl-6 text-base text-slate-800 ${s.heading ? 'mt-2' : ''}`}>
                {s.list.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            {s.slot === 'raffle-details' && raffleDetails && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-base text-slate-800">{raffleDetails}</p>
            )}
          </Card>
        ))}

        {page.reserveClosedNote && <Note>{page.reserveClosedNote}</Note>}

        {page.emailSignup && (
          <a href={`mailto:${page.emailSignup}`} className={btn.blue}>
            <Icon name="mail" size={20} /> Email to sign up
          </a>
        )}

        {c && (
          <Card className="print-break-inside-avoid">
            <h2 className="font-display text-xl font-extrabold text-ink">Contact</h2>
            <ul className="mt-3 space-y-2 text-base">
              {c.address && (
                <li>
                  <a href={directionsHref(c.address)} {...ext} className={linkText}>
                    {c.address}
                  </a>
                </li>
              )}
              {c.phone && (
                <li>
                  <a href={telHref(c.phone)} className={linkText}>
                    {c.phone}
                  </a>
                </li>
              )}
            </ul>
            {c.url && (
              <a href={c.url} {...ext} className={`${btn.blue} no-print mt-4`}>
                {c.urlLabel ?? 'Website'}
              </a>
            )}
          </Card>
        )}

        {extra}

        {page.related.length > 0 && (
          <section className="no-print">
            <h2 className="font-display text-lg font-extrabold text-ink">{page.relatedLabel ?? 'Related'}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {page.related.map((r) => (
                <RowLink key={r.to} to={r.to} fromDatabase>
                  {r.label}
                </RowLink>
              ))}
            </div>
          </section>
        )}

        <p className="no-print pt-2 text-base">
          <SmartLink to="/bunfest" className={linkText}>
            Back to Midwest BunFest
          </SmartLink>
        </p>
      </Container>
    </>
  )
}
