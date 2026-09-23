import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Chip, Container, H2, LoadError, Loading, Note, PageTitle, linkText } from '../components/ui'
import { useAuction, useFestival, type AuctionItem } from '../lib/data'
import { dollars } from '../lib/format'

// A look at the silent auction and raffle prizes before the day, from the
// items OHRR scans in as they're donated (the app: Scan an item).

const SESSION_LABEL: Record<string, string> = {
  morning: 'Morning session',
  afternoon: 'Afternoon session',
  'all-day': 'All day',
}

export default function Auction() {
  const f = useFestival()
  const auction = useAuction(f.festival?.slug)
  const a = auction.data

  const sessions = a ? [...new Set(a.items.map((i) => i.session))] : []
  const rank = (s: string) => {
    const i = ['morning', 'afternoon', 'all-day'].indexOf(s)
    return i < 0 ? 99 : i
  }
  sessions.sort((x, y) => rank(x) - rank(y))

  return (
    <>
      <PageTitle
        title="Silent auction"
        icon="award"
        crumbs={[{ to: '/festival', label: 'At the festival' }]}
        intro="Bid at the festival on donated items and gift baskets. Proceeds support Ohio House Rabbit Rescue."
      />
      <Container className="mt-8 space-y-10">
        {f.error || auction.error ? (
          <LoadError retry={f.error ? f.retry : auction.retry} what="the auction items" />
        ) : !a ? (
          <Loading what="the auction items" />
        ) : (
          <>
            {a.settings.intro && <Note>{a.settings.intro}</Note>}
            <p className="text-base">
              Bidding and the raffle happen in person on the day.{' '}
              <Link to="/festival/raffle" className={linkText}>
                How the raffle and auction work
              </Link>
            </p>
            {a.items.length === 0 ? (
              <Note>Items are added here as they're donated.</Note>
            ) : (
              sessions.map((s) => (
                <section key={s}>
                  {sessions.length > 1 && <H2>{SESSION_LABEL[s] ?? s}</H2>}
                  <Items items={a.items.filter((i) => i.session === s)} />
                </section>
              ))
            )}
            {a.prizes.length > 0 && (
              <section>
                <H2>Raffle prizes</H2>
                <Items items={a.prizes} />
              </section>
            )}
          </>
        )}
      </Container>
    </>
  )
}

function Items({ items }: { items: AuctionItem[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const gone = i.status === 'won' || i.status === 'drawn'
        return (
          <li key={i.id} className="print-break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {i.photoUrl ? (
              <img src={i.photoUrl} alt={i.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div aria-hidden="true" className="flex aspect-[4/3] w-full items-center justify-center bg-fest-50 text-fest-dark">
                <Icon name="gift" size={48} />
              </div>
            )}
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-extrabold text-ink">{i.title}</h3>
                {gone && <Chip tone="grey">{i.status === 'drawn' ? 'Drawn' : 'Won'}</Chip>}
              </div>
              {i.description && <p className="mt-1 text-base text-slate-800">{i.description}</p>}
              <p className="mt-2 flex flex-wrap gap-x-4 text-base text-slate-700">
                {i.valueCents ? <span>Value {dollars(i.valueCents)}</span> : null}
                {i.donatedBy && <span>Donated by {i.donatedBy}</span>}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
