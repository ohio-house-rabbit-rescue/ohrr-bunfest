import { Card, Container, H2, Initial, LoadError, Loading, Note, PageTitle, WebLink, linkText } from '../components/ui'
import { TIER_LABEL, TIER_ORDER, useOrg, useSponsors } from '../lib/data'
import { OHRR_EMAIL_FALLBACK } from '../lib/links'

// The companies that make BunFest possible, by level. Each sponsorship has an
// end date in OHRR's records, so a sponsor drops off this page on its own
// when the term is over — nobody has to remember to take them down.
export default function Sponsors() {
  const sponsors = useSponsors()
  const org = useOrg()
  const email = org.data?.email ?? OHRR_EMAIL_FALLBACK
  const list = sponsors.data ?? []

  return (
    <>
      <PageTitle title="Sponsors" icon="award" intro="Thank you to the companies and practices that make Midwest BunFest possible." />
      <Container className="mt-8 space-y-10">
        {sponsors.error ? (
          <LoadError retry={sponsors.retry} what="the sponsors" />
        ) : sponsors.loading ? (
          <Loading what="the sponsors" />
        ) : list.length === 0 ? (
          <Note>This year's sponsors are announced closer to the festival.</Note>
        ) : (
          TIER_ORDER.map((tier) => {
            const here = list.filter((s) => s.tier === tier)
            if (here.length === 0) return null
            return (
              <section key={tier}>
                <H2>{TIER_LABEL[tier]}</H2>
                <ul className={`mt-4 grid gap-4 ${tier === 'presenting' ? '' : 'md:grid-cols-2'}`}>
                  {here.map((s) => (
                    <li key={s.id}>
                      <Card className="flex h-full gap-4">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" loading="lazy" className="h-16 w-auto max-w-[8rem] shrink-0 object-contain" />
                        ) : (
                          <Initial name={s.name} className="h-16 w-16 text-2xl" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-display text-xl font-extrabold text-ink">{s.name}</h3>
                          {s.blurb && <p className="mt-1 text-base text-slate-800">{s.blurb}</p>}
                          {s.website && (
                            <p className="mt-2 text-base">
                              <WebLink url={s.website} />
                            </p>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
        <Card className="bg-brand-orange-50/60">
          <H2>Sponsoring BunFest</H2>
          <p className="mt-2 text-base text-slate-800">
            Interested in sponsoring next year? Email{' '}
            <a href={`mailto:${email}?subject=${encodeURIComponent('Sponsoring Midwest BunFest')}`} className={`${linkText} break-all`}>
              {email}
            </a>{' '}
            and a volunteer will reply as soon as they can.
          </p>
        </Card>
      </Container>
    </>
  )
}
