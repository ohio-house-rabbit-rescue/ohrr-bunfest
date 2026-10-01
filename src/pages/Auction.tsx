import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Chip, Container, H2, LoadError, Loading, Note, PageTitle, linkText } from '../components/ui'
import { AuctionClosed, BidderBar, HowBiddingWorks, ItemPhoto, shipLine } from '../components/auction'
import { useFestival, type AuctionItem as ListedItem } from '../lib/data'
import { useCatalog, useRemembered, useServerNow } from '../lib/auction'
import { bidLine, closesIn, fmtWhen, money, type AuctionItem, type AuctionSettings } from '../lib/auctionClient'
import { dollars } from '../lib/format'

// The silent auction: the items OHRR scans in as they're donated (the app:
// Scan an item), with online bidding once OHRR turns it on. Until the bidding
// functions are on the database the page shows the plain list, as before.

const SESSION_LABEL: Record<string, string> = {
  morning: 'Morning session',
  afternoon: 'Afternoon session',
  'all-day': 'All day',
}

function sessionCloses(s: string, settings: AuctionSettings | null): string | null {
  if (!settings) return null
  const at = s === 'morning' ? settings.morning_closes_at : s === 'afternoon' ? settings.afternoon_closes_at : null
  return at ? `Closes ${fmtWhen(at)}` : null
}

export default function Auction() {
  const f = useFestival()
  const c = useCatalog(f.festival?.slug)
  const me = useRemembered()
  const cat = c.catalog
  const now = useServerNow(cat?.now ?? null)
  const settings = cat?.settings ?? null
  const open = !!settings?.bidding_enabled && !!settings.stripe_publishable_key

  const sessions = cat ? [...new Set(cat.items.map((i) => i.session))] : []
  const rank = (s: string) => {
    const i = ['morning', 'afternoon', 'all-day'].indexOf(s)
    return i < 0 ? 99 : i
  }
  sessions.sort((x, y) => rank(x) - rank(y))

  if (cat && !cat.enabled) return <AuctionClosed />

  return (
    <>
      <PageTitle
        title="Silent auction"
        icon="award"
        crumbs={[{ to: '/festival', label: 'At the festival' }]}
        intro={
          open
            ? 'Bid online on donated items and gift baskets, or at the auction table on the day. Every dollar supports Ohio House Rabbit Rescue.'
            : 'Donated items and gift baskets, with every dollar supporting Ohio House Rabbit Rescue. Online bidding opens before the festival; on the day, bid at the auction table.'
        }
      />
      <Container className="mt-8 space-y-10">
        {f.error || c.error ? (
          <LoadError retry={f.error ? f.retry : c.retry} what="the auction items" />
        ) : !cat ? (
          <Loading what="the auction items" />
        ) : (
          <>
            {c.intro && <Note>{c.intro}</Note>}
            <BidderBar me={me} settings={settings} />
            <HowBiddingWorks settings={settings} />
            <p className="text-base">
              <Link to="/festival/raffle" className={linkText}>
                How the raffle works
              </Link>
            </p>
            {cat.items.length === 0 ? (
              <Note>Items are added here as they're donated.</Note>
            ) : (
              sessions.map((s) => {
                const closes = sessionCloses(s, settings)
                return (
                  <section key={s}>
                    {sessions.length > 1 && (
                      <div className="flex flex-wrap items-baseline gap-x-4">
                        <H2>{SESSION_LABEL[s] ?? s}</H2>
                        {closes && <span className="text-base text-slate-700">{closes}</span>}
                      </div>
                    )}
                    <Items items={cat.items.filter((i) => i.session === s)} live={cat.live} now={now} />
                  </section>
                )
              })
            )}
            {c.prizes.length > 0 && (
              <section>
                <H2>Raffle prizes</H2>
                <p className="mt-1 text-base text-slate-700">Raffle tickets are sold at the festival; prizes are drawn on the day.</p>
                <Prizes items={c.prizes} />
              </section>
            )}
          </>
        )}
      </Container>
    </>
  )
}

/** The auction items: each card opens the item's own page, where the bidding is. */
function Items({ items, live, now }: { items: AuctionItem[]; live: boolean; now: string }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const sold = i.status === 'won'
        const facts = [i.value_cents ? `Value ${money(i.value_cents)}` : null, i.donated_by ? `Donated by ${i.donated_by}` : null].filter(Boolean)
        return (
          <li key={i.id} className="print-break-inside-avoid">
            <Link
              to={`/auction/${i.id}`}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-blue"
            >
              <ItemPhoto item={i} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-extrabold text-ink">{i.title}</h3>
                  {sold && <Chip tone="grey">Sold</Chip>}
                  {i.is_open && <Chip tone="orange">Open</Chip>}
                </div>
                {facts.length > 0 && <p className="mt-1 text-base text-slate-700">{facts.join(' · ')}</p>}
                {live && (
                  <div className="mt-3 space-y-1 text-base text-slate-800">
                    <p className="font-bold text-ink">{bidLine(i)}</p>
                    {!sold && i.buy_now_cents != null && <p>Buy now {money(i.buy_now_cents)}</p>}
                    {!sold && <p>{shipLine(i)}</p>}
                    {i.is_open && <p className="text-fest-dark">{closesIn(i.closes_at, now)}</p>}
                  </div>
                )}
                <span className={`${linkText} mt-auto inline-flex items-center gap-1 pt-3`}>
                  {sold ? 'See the item' : live && i.is_open ? 'See the item and bid' : 'See the item'}
                  <Icon name="chevron" size={20} />
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** The ticket-raffle prizes, which aren't bid on. */
function Prizes({ items }: { items: ListedItem[] }) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const gone = i.status === 'drawn' || i.status === 'won'
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
                {gone && <Chip tone="grey">Drawn</Chip>}
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
