import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Card, Chip, Container, H2, LoadError, Loading, Note, PageTitle, PrintButton, btn, linkText } from '../components/ui'
import { ItemPhoto, Message, shipLine } from '../components/auction'
import { confirmPaymentAction } from '../components/CardSetup'
import { useFestival } from '../lib/data'
import { supabase } from '../lib/supabase'
import { POLL_MS, centsToDollars, useCatalog, usePoll, useRemembered, useServerNow } from '../lib/auction'
import {
  auctionApi,
  bidLine,
  closesIn,
  dollarsToCents,
  fetchItemBids,
  fetchMyPage,
  fmtWhen,
  money,
  placeBid,
  sessionLabel,
  shippingFor,
  whyClosed,
  type AuctionItem as Item,
  type AuctionSettings,
  type BidRow,
  type MyPage,
  type Sale,
} from '../lib/auctionClient'

// One auction item: what it is, who gave it, and the bidding — current bid,
// the next minimum, the countdown, a bid form for a registered bidder, Buy
// now, and every bid so far (bidder numbers only, never names).

export default function AuctionItem() {
  const { id } = useParams()
  const f = useFestival()
  const c = useCatalog(f.festival?.slug)
  const cat = c.catalog
  const item = cat?.items.find((i) => i.id === id)
  const now = useServerNow(cat?.now ?? null)
  const me = useRemembered()
  const mine = usePoll(me ? `me:${me.access_token}` : null, () => fetchMyPage(supabase, me!.access_token), null)
  const live = !!cat?.live
  const bids = usePoll(live && id ? `bids:${id}` : null, () => fetchItemBids(supabase, id!), item?.is_open ? POLL_MS : null)

  const crumbs = [
    { to: '/festival', label: 'At the festival' },
    { to: '/auction', label: 'Silent auction' },
  ]

  if (f.error || c.error) {
    return (
      <>
        <PageTitle title="Auction item" crumbs={crumbs} />
        <Container>
          <LoadError retry={f.error ? f.retry : c.retry} what="this item" />
        </Container>
      </>
    )
  }
  if (!cat) {
    return (
      <>
        <PageTitle title="Auction item" crumbs={crumbs} />
        <Container>
          <Loading what="this item" />
        </Container>
      </>
    )
  }
  if (!item) {
    return (
      <>
        <PageTitle title="Item not found" crumbs={crumbs} />
        <Container className="mt-8 space-y-4">
          <Note>
            That item isn't in this year's auction — it may have been removed, or the link was copied wrongly.{' '}
            <Link to="/auction" className={linkText}>
              See every item
            </Link>
          </Note>
        </Container>
      </>
    )
  }

  const settings = cat.settings
  const closed = whyClosed(item, settings, now)
  const facts = [
    item.donated_by ? { k: 'Donated by', v: item.donated_by } : null,
    item.value_cents ? { k: 'Value', v: money(item.value_cents) } : null,
    { k: 'Session', v: sessionLabel(item.session) },
  ].filter((x): x is { k: string; v: string } => !!x)

  return (
    <>
      <PageTitle title={item.title} icon="award" crumbs={crumbs} />
      <Container className="mt-8">
        {/* On a phone the bidding box comes right after the photo — the answer first, the history after. */}
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:gap-x-8">
          <div className="min-w-0 lg:col-start-1">
            <ItemPhoto item={item} className="aspect-[4/3] w-full rounded-2xl" />
          </div>

          <div className="space-y-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-4 lg:self-start">
            <BidBox
              item={item}
              settings={settings}
              now={now}
              live={live}
              closed={closed}
              me={me ? { token: me.access_token, no: me.bidder_no } : null}
              mine={mine.data}
              onChanged={async () => {
                await Promise.all([c.refresh(), bids.refresh(), mine.refresh()])
              }}
            />
            <div className="no-print flex flex-wrap gap-3">
              <Link to="/auction" className={btn.outline}>
                <Icon name="arrowLeft" size={20} /> Back to the auction
              </Link>
              <PrintButton label="Print" />
            </div>
          </div>

          <div className="min-w-0 space-y-4 lg:col-start-1">
            <dl className="grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
              {facts.map((x) => (
                <div key={x.k} className="contents">
                  <dt className="font-bold text-ink">{x.k}</dt>
                  <dd className="text-slate-800">{x.v}</dd>
                </div>
              ))}
            </dl>
            {item.description && <p className="whitespace-pre-line text-base text-slate-800">{item.description}</p>}
          </div>

          {live && (
            <section className="min-w-0 lg:col-start-1">
              <H2>Bids so far</H2>
              <BidHistory rows={bids.data} loading={bids.loading} error={bids.error} me={me?.bidder_no ?? null} />
            </section>
          )}
        </div>
      </Container>
    </>
  )
}

/* ------------------------------------------------------------- bid box */

function BidBox({
  item,
  settings,
  now,
  live,
  closed,
  me,
  mine,
  onChanged,
}: {
  item: Item
  settings: AuctionSettings | null
  now: string
  live: boolean
  closed: string | null
  me: { token: string; no: number } | null
  mine: MyPage | null
  onChanged: () => Promise<void>
}) {
  const sold = item.status === 'won'
  const youAreHigh = !!me && item.high_bidder_no != null && item.high_bidder_no === me.no
  return (
    <Card className="print-break-inside-avoid">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-extrabold text-ink">Bidding</h2>
        {sold && <Chip tone="grey">Sold</Chip>}
        {item.is_open && <Chip tone="orange">Open</Chip>}
      </div>

      {live ? (
        <dl className="mt-3 space-y-1.5 text-base">
          <Row k={sold ? 'Result' : item.current_bid_cents != null ? 'Current bid' : 'Starting bid'}>
            <strong className="text-ink">
              {sold
                ? bidLine(item)
                : item.current_bid_cents != null
                  ? `${money(item.current_bid_cents)} · ${item.bid_count} bid${item.bid_count === 1 ? '' : 's'}`
                  : item.starting_bid_cents
                    ? money(item.starting_bid_cents)
                    : 'No bids yet'}
            </strong>
          </Row>
          {!sold && <Row k="Next bid">at least {money(item.next_min_cents)}</Row>}
          {item.high_bidder_no != null && (
            <Row k="High bidder">
              {youAreHigh ? <strong className="text-brand-orange-ink">You (Bidder #{me!.no})</strong> : `Bidder #${item.high_bidder_no}`}
            </Row>
          )}
          {!sold && item.buy_now_cents != null && <Row k="Buy now">{money(item.buy_now_cents)}</Row>}
          {item.closes_at && (
            <Row k="Closes">
              {fmtWhen(item.closes_at)}
              {item.is_open && <span className="block text-fest-dark">{closesIn(item.closes_at, now)}</span>}
            </Row>
          )}
          <Row k="Delivery">{shipLine(item)}</Row>
        </dl>
      ) : (
        <p className="mt-3 text-base text-slate-800">Online bidding opens before the festival; on the day, bid at the auction table.</p>
      )}

      {!live ? null : closed ? (
        <p className="mt-4 text-base font-semibold text-slate-800">{closed}</p>
      ) : !me ? (
        <div className="no-print mt-4 space-y-3">
          <Link to={`/auction/register?next=${encodeURIComponent(`/auction/${item.id}`)}`} className={`${btn.primary} w-full`}>
            <Icon name="gavel" size={22} /> Register to bid
          </Link>
          <p className="text-sm text-slate-700">Register once with a card, then bid on any item. Charged only if you win.</p>
        </div>
      ) : (
        <BidForm item={item} settings={settings} token={me.token} no={me.no} mine={mine} onChanged={onChanged} />
      )}
    </Card>
  )
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-600">{k}</dt>
      <dd className="min-w-0 text-slate-800">{children}</dd>
    </div>
  )
}

/* ----------------------------------------------- place a bid / buy now */

function BidForm({
  item,
  settings,
  token,
  no,
  mine,
  onChanged,
}: {
  item: Item
  settings: AuctionSettings | null
  token: string
  no: number
  mine: MyPage | null
  onChanged: () => Promise<void>
}) {
  const [amount, setAmount] = useState(() => centsToDollars(item.next_min_cents))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState<'bid' | 'buy' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: ReactNode } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [bought, setBought] = useState<Sale | null>(null)

  // Follow the minimum up as others bid, until the bidder types their own number.
  useEffect(() => {
    if (!touched) setAmount(centsToDollars(item.next_min_cents))
  }, [item.next_min_cents, touched])

  const inc = item.increment_cents
  const min = item.next_min_cents
  const quick = [min, min + inc, min + 2 * inc, min + 5 * inc].filter((v) => item.buy_now_cents == null || v < item.buy_now_cents)

  async function bid(e: FormEvent) {
    e.preventDefault()
    const cents = dollarsToCents(amount)
    if (cents == null) {
      setMsg({ tone: 'error', text: 'Enter an amount in dollars, like 25 or 25.50.' })
      return
    }
    setBusy('bid')
    setMsg(null)
    try {
      const r = await placeBid(supabase, token, item.id, cents)
      setTouched(false)
      setAmount(centsToDollars(r.item.next_min_cents))
      setMsg({
        tone: 'ok',
        text:
          r.item.high_bidder_no === no
            ? `Your bid of ${money(cents)} is in — you're the high bidder (Bidder #${no}).`
            : `Your bid of ${money(cents)} is in. Bidder #${r.item.high_bidder_no} is high at ${money(r.item.current_bid_cents)}.`,
      })
      await onChanged()
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
      await onChanged()
    }
    setBusy(null)
  }

  async function buy() {
    setBusy('buy')
    setMsg(null)
    try {
      let r = await auctionApi.buyNow(token, item.id)
      if (!r.ok && r.requires_action) {
        const pk = settings?.stripe_publishable_key
        if (!pk) throw new Error('The bank asked for a check, but this site cannot show it. Please see the auction desk.')
        const check = await confirmPaymentAction(pk, r.client_secret)
        if (!check.ok) throw new Error(check.error ?? 'The bank did not approve the payment.')
        const done = await auctionApi.complete(token, r.sale.sale_id)
        r = done.sale.payment_status === 'paid' ? { ok: true, sale: done.sale } : { ok: false, error: done.sale.failure_message ?? 'The payment was not completed.', sale: done.sale }
      }
      if (r.ok) {
        setBought(r.sale)
      } else {
        setBought(r.sale)
        setMsg({ tone: 'error', text: r.error })
      }
      setConfirming(false)
      await onChanged()
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
      setConfirming(false)
      await onChanged()
    }
    setBusy(null)
  }

  const shipping = shippingFor(item, mine?.bidder ?? null)
  const total = (item.buy_now_cents ?? 0) + shipping
  const card = mine?.bidder.card_brand && mine.bidder.card_last4 ? `${cap(mine.bidder.card_brand)} ending ${mine.bidder.card_last4}` : 'your saved card'

  if (bought) {
    return (
      <div className="no-print mt-4 space-y-3">
        {bought.payment_status === 'paid' || bought.payment_status === 'pending' ? (
          <Message tone="ok">
            <strong>It's yours.</strong> {item.title} is sold to you for {money(bought.amount_cents)}
            {bought.ship_fee_cents ? ` plus ${money(bought.ship_fee_cents)} shipping` : ''}
            {bought.payment_status === 'paid' ? ', charged to your card' : ''}.
          </Message>
        ) : (
          <Message tone="error">
            {item.title} is held for you, but the payment didn't go through{bought.failure_message ? `: ${bought.failure_message}` : ''}. You can
            pay from your bids page.
          </Message>
        )}
        <Link to="/auction/me" className={`${btn.blue} w-full`}>
          See your wins
        </Link>
      </div>
    )
  }

  return (
    <div className="no-print mt-4 space-y-4">
      <form onSubmit={bid} className="space-y-3" aria-label="Place a bid">
        <label htmlFor="bid-amount" className="block text-base font-bold text-ink">
          Your bid (dollars)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-slate-600" aria-hidden="true">
            $
          </span>
          <input
            id="bid-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => {
              setTouched(true)
              setAmount(e.target.value)
            }}
            className="block min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xl font-bold text-ink focus:border-brand-blue"
          />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Quick amounts">
          {quick.map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setTouched(true)
                setAmount(centsToDollars(v))
              }}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-slate-300 bg-white px-4 text-base font-bold text-ink hover:border-brand-blue"
            >
              {money(v)}
              {i === 0 ? ' (minimum)' : ''}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy !== null} className={`${btn.primary} w-full disabled:opacity-60`}>
          <Icon name="gavel" size={22} /> {busy === 'bid' ? 'Placing your bid…' : 'Place bid'}
        </button>
        <p className="text-sm text-slate-700">Bids go up in steps of {money(inc)}. You're Bidder #{no}.</p>
      </form>

      {item.buy_now_cents != null && (
        <div className="border-t border-slate-200 pt-4">
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} disabled={busy !== null} className={`${btn.blue} w-full disabled:opacity-60`}>
              Buy now for {money(item.buy_now_cents)}
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border-2 border-brand-blue bg-brand-blue-50 p-4">
              <p className="text-base text-ink">
                <strong>Buy {item.title} now?</strong> You'll pay {money(item.buy_now_cents)}
                {shipping ? ` plus ${money(shipping)} shipping — ${money(total)} in all` : ''}, charged to {card}. This ends the
                bidding on this item.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={buy} disabled={busy !== null} className={`${btn.primary} disabled:opacity-60`}>
                  {busy === 'buy' ? 'Buying…' : `Yes, buy it for ${money(total)}`}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={busy !== null} className={btn.outline}>
                  No, go back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {msg && <Message tone={msg.tone}>{msg.text}</Message>}
    </div>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ------------------------------------------------------- bid history */

function BidHistory({ rows, loading, error, me }: { rows: BidRow[] | null; loading: boolean; error: string | null; me: number | null }) {
  if (error) return <p className="mt-2 text-base text-slate-700">The bid history couldn't be loaded just now.</p>
  if (loading || !rows) return <p className="mt-2 text-base text-slate-700">Loading the bids…</p>
  if (rows.length === 0) return <p className="mt-2 text-base text-slate-700">No bids yet.</p>
  return (
    <ol className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {rows.map((b, i) => (
        <li key={`${b.at}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-base">
          <span className="w-24 font-bold text-ink">{money(b.amount_cents)}</span>
          <span className="text-slate-800">
            {b.bidder_no != null ? `Bidder #${b.bidder_no}` : 'At the desk'}
            {me != null && b.bidder_no === me ? ' (you)' : ''}
          </span>
          <span className="text-slate-600">{fmtWhen(b.at)}</span>
          {b.kind === 'buy_now' && <Chip tone="grey">Buy now</Chip>}
          {b.is_high && <Chip tone="orange">High</Chip>}
        </li>
      ))}
    </ol>
  )
}
