import { Card, Container, H2, LoadError, Loading, PageTitle, PrintButton, Rule, RowLink, WebLink, linkText } from '../components/ui'
import { useFestival, usePages, useRhdv2Vets, type FestivalPage } from '../lib/data'
import { OHRR_SITE, directionsHref, ext, telHref } from '../lib/links'

// The rabbit rules on one printable page: the vaccination rule, what counts as
// proof, the attendance agreement, and where to get the vaccine. All of it is
// OHRR's own wording from the festival pages (Staff → BunFest → Pages), and the
// vaccine list is every practice OHRR has ticked "gives the RHDV2 vaccine".
export default function YourRabbit() {
  const f = useFestival()
  const pages = usePages(f.festival?.year)
  const vets = useRhdv2Vets()
  if (f.error || pages.error) return <LoadError retry={f.error ? f.retry : pages.retry} what="the rabbit rules" />
  if (!f.festival || pages.loading) return <Loading />

  const bringing = pages.data?.find((p) => p.slug === 'bringing-bunny')
  const agreement = pages.data?.find((p) => p.slug === 'attendance-agreement')
  const rule = bringing?.note ?? f.festival.info.rabbitRule

  return (
    <>
      <PageTitle
        title="Bringing your rabbit"
        icon="heart"
        intro={bringing?.subtitle ?? 'Everything required before you bring your rabbit to BunFest.'}
      />
      <Container className="print-urls mt-8 space-y-8">
        <div className="no-print flex flex-wrap gap-3">
          <PrintButton label="Print the rabbit rules" />
        </div>

        {rule && (
          <Rule>
            <p className="font-semibold">{rule}</p>
          </Rule>
        )}

        {bringing && <Sections page={bringing} />}

        {agreement && (
          <section id="agreement" className="scroll-mt-24 print-break-inside-avoid">
            <H2>{agreement.title}</H2>
            {agreement.subtitle && <p className="mt-2 text-base text-slate-700">{agreement.subtitle}</p>}
            <Card className="mt-4">
              {agreement.sections.map((s, i) => (
                <div key={i}>
                  {s.heading && <h3 className="font-display text-lg font-extrabold text-ink">{s.heading}</h3>}
                  {s.body && <p className="mt-1 text-base">{s.body}</p>}
                  {s.list && (
                    <ol className="mt-2 list-decimal space-y-2 pl-6 text-base">
                      {s.list.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </Card>
          </section>
        )}

        <section id="vaccine" className="scroll-mt-24 print-break-inside-avoid">
          <H2>Where to get the RHDV2 vaccine</H2>
          <p className="mt-2 text-base text-slate-700">
            Practices in central Ohio that OHRR lists as giving the vaccine. Call ahead — your own vet can advise too.
          </p>
          {vets.error ? (
            <LoadError retry={vets.retry} what="the vaccine list" />
          ) : vets.loading ? (
            <Loading what="the vaccine list" />
          ) : (vets.data ?? []).length === 0 ? (
            <p className="mt-4 text-base">OHRR hasn't listed any practices yet. Ask your own vet.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {vets.data!.map((v) => {
                const address = [v.address, v.city].filter(Boolean).join(', ')
                return (
                  <li key={v.id}>
                    <Card className="h-full">
                      <h3 className="font-display text-lg font-extrabold text-ink">{v.name}</h3>
                      {v.doctors && <p className="text-base text-slate-700">{v.doctors}</p>}
                      {v.rhdv2_note && <p className="mt-1 text-base font-semibold text-slate-800">{v.rhdv2_note}</p>}
                      {address && (
                        <p className="mt-2 text-base">
                          <a href={directionsHref(address)} {...ext} className={linkText}>
                            {address}
                          </a>
                        </p>
                      )}
                      {v.phone && (
                        <p className="mt-1 text-base">
                          <a href={telHref(v.phone)} className={linkText}>
                            {v.phone}
                          </a>
                        </p>
                      )}
                      {v.website && (
                        <p className="mt-1 text-base">
                          <WebLink url={v.website} />
                        </p>
                      )}
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="no-print mt-4 text-base">
            <a href={`${OHRR_SITE}/learn/vets`} {...ext} className={linkText}>
              OHRR's full list of rabbit vets
            </a>
          </p>
        </section>

        <section className="no-print">
          <H2>Also</H2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RowLink to="/festival/lounge">The Chillaxabun Lounge — a quiet room for your rabbit</RowLink>
            <RowLink to="/festival/spa">The Bunny Spa</RowLink>
            <RowLink to="/festival/glamour">Glamour Shots</RowLink>
            <RowLink to="/visit">Plan your visit</RowLink>
          </div>
        </section>
      </Container>
    </>
  )
}

function Sections({ page }: { page: FestivalPage }) {
  return (
    <div className="space-y-4">
      {page.sections.map((s, i) => (
        <Card key={i} className="print-break-inside-avoid">
          {s.heading && <h2 className="font-display text-xl font-extrabold text-ink">{s.heading}</h2>}
          {s.body && <p className={`text-base ${s.heading ? 'mt-2' : ''}`}>{s.body}</p>}
          {s.list && (
            <ul className={`list-disc space-y-1.5 pl-6 text-base ${s.heading ? 'mt-2' : ''}`}>
              {s.list.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  )
}
