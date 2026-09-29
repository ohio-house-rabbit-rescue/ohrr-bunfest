import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Card, Chip, Container, H2, Loading, Note, PageTitle, PrintButton, btn, linkText } from '../components/ui'
import { Choice, Field, Message } from '../components/auction'
import CardSetup, { confirmPaymentAction } from '../components/CardSetup'
import { supabase } from '../lib/supabase'
import { POLL_MS, isMissingFunction, remember, usePoll, useRemembered, useServerNow } from '../lib/auction'
import {
  FULFIL_LABEL,
  PAYMENT_LABEL,
  auctionApi,
  closesIn,
  fetchMyPage,
  fmtWhen,
  money,
  updateBidder,
  type Address,
  type Bidder,
  type Fulfil,
  type MyBid,
  type MyPage,
  type Sale,
} from '../lib/auctionClient'

// The bidder's own page: who they are, the card on file, every bid (high or
// outbid) and every win with what it cost and where it is. Reached from the
// bidder this device remembers, or from the private link on any device.

export default function AuctionMe() {
  const { token: linkToken } = useParams()
  const navigate = useNavigate()
  const remembered = useRemembered()
  const token = linkToken ?? remembered?.access_token ?? null
  const page = usePoll(token ? `me:${token}` : null, () => fetchMyPage(supabase, token!), POLL_MS)
  const now = useServerNow(page.data?.now ?? null)

  // Opened from the private link: this device now remembers the bidder too.
  useEffect(() => {
    if (linkToken && page.data?.bidder) {
      remember(page.data.bidder)
      navigate('/auction/me', { replace: true })
    }
  }, [linkToken, page.data, navigate])

  const crumbs = [
    { to: '/festival', label: 'At the festival' },
    { to: '/auction', label: 'Silent auction' },
  ]

  if (!token) {
    return (
      <>
        <PageTitle title="Your bids" icon="gavel" crumbs={crumbs} />
        <Container className="mt-8 max-w-2xl space-y-4">
          <Note>
            <strong>No bidder is registered on this device.</strong> Register once to bid online. If you registered on another device, open
            the private link from your bids page there.
          </Note>
          <Link to="/auction/register?next=%2Fauction%2Fme" className={btn.primary}>
            <Icon name="gavel" size={22} /> Register to bid
          </Link>
          <p>
            <Link to="/auction" className={linkText}>
              See the auction items
            </Link>
          </p>
        </Container>
      </>
    )
  }

  if (page.loading) {
    return (
      <>
        <PageTitle title="Your bids" icon="gavel" crumbs={crumbs} />
        <Container>
          <Loading what="your bids" />
        </Container>
      </>
    )
  }

  if (page.error || !page.data) {
    return (
      <>
        <PageTitle title="Your bids" icon="gavel" crumbs={crumbs} />
        <Container className="mt-8 max-w-2xl space-y-4">
          <Note>
            {page.error && isMissingFunction(page.error) ? (
              <>
                <strong>Online bidding hasn't opened yet.</strong> Your bids will show here once it has.
              </>
            ) : page.error ? (
              <>
                <strong>We couldn't load your bids just now.</strong> {page.error}
              </>
            ) : (
              <>
                <strong>We couldn't find that registration.</strong> The link may have been copied wrongly, or bidding hasn't opened yet.
              </>
            )}
          </Note>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void page.refresh()} className={btn.blue}>
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                remember(null)
                navigate('/auction/register')
              }}
              className={btn.outline}
            >
              Register again
            </button>
          </div>
        </Container>
      </>
    )
  }

  const d = page.data
  return (
    <>
      <PageTitle title="Your bids" icon="gavel" crumbs={crumbs} intro={`Bidder #${d.bidder.bidder_no} · ${d.bidder.name}`} />
      <Container className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-10">
          <Bids bids={d.bids} now={now} />
          <Wins page={d} token={token} onChanged={page.refresh} />
        </div>
        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <You page={d} token={token} onChanged={page.refresh} />
          <CardOnFile page={d} token={token} onChanged={page.refresh} />
          <PrivateLink token={token} />
          <div className="no-print flex flex-wrap gap-3">
            <Link to="/auction" className={btn.outline}>
              <Icon name="arrowLeft" size={20} /> The auction
            </Link>
            <PrintButton label="Print" />
          </div>
          <p className="no-print text-sm text-slate-700">
            Not you?{' '}
            <button
              type="button"
              onClick={() => {
                remember(null)
                navigate('/auction/register')
              }}
              className={linkText}
            >
              Register again
            </button>
          </p>
        </div>
      </Container>
    </>
  )
}

/* ------------------------------------------------------------ your bids */

function Bids({ bids, now }: { bids: MyBid[]; now: string }) {
  // One row per item: the newest bid on each (the list arrives newest first).
  const seen = new Set<string>()
  const latest: MyBid[] = []
  for (const b of bids) {
    if (seen.has(b.item.id)) continue
    seen.add(b.item.id)
    latest.push(b)
  }
  return (
    <section>
      <H2>Your bids</H2>
      {latest.length === 0 ? (
        <p className="mt-2 text-base text-slate-700">
          You haven't bid yet.{' '}
          <Link to="/auction" className={linkText}>
            See the items
          </Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {latest.map((b) => {
            const it = b.item
            const won = it.status === 'won'
            return (
              <li key={b.bid_id} className="print-break-inside-avoid flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/auction/${it.id}`} className={`${linkText} text-lg`}>
                    {it.title}
                  </Link>
                  <p className="text-base text-slate-800">
                    {won
                      ? b.is_high
                        ? `Won at ${money(it.current_bid_cents)}`
                        : `Sold to another bidder for ${money(it.current_bid_cents)}`
                      : b.is_high
                        ? `You're high at ${money(b.amount_cents)}`
                        : `Outbid — the high bid is ${money(it.current_bid_cents)}; the next is at least ${money(it.next_min_cents)}`}
                    {it.is_open && ` · ${closesIn(it.closes_at, now)}`}
                  </p>
                </div>
                {won ? (
                  <Chip tone="grey">{b.is_high ? 'Won' : 'Sold'}</Chip>
                ) : b.is_high ? (
                  <Chip tone="orange">High</Chip>
                ) : (
                  <Link to={`/auction/${it.id}`} className={`${btn.blue} no-print`}>
                    Bid again
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ your wins */

function Wins({ page, token, onChanged }: { page: MyPage; token: string; onChanged: () => Promise<void> }) {
  const settings = page.settings
  return (
    <section>
      <H2>Your wins</H2>
      {page.won.length === 0 ? (
        <p className="mt-2 text-base text-slate-700">Nothing yet. Winners are charged automatically when their session closes, and it shows here.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {page.won.map((s) => (
            <Win key={s.sale_id} sale={s} fulfil={page.bidder.fulfil} pickupNote={settings?.pickup_note ?? null} publishableKey={settings?.stripe_publishable_key ?? null} token={token} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Win({
  sale,
  fulfil,
  pickupNote,
  publishableKey,
  token,
  onChanged,
}: {
  sale: Sale
  fulfil: Fulfil
  pickupNote: string | null
  publishableKey: string | null
  token: string
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const title = sale.item?.title ?? 'Auction item'
  const kind = sale.kind === 'buy_now' ? 'Buy now' : sale.kind === 'desk' ? 'At the desk' : 'Winning bid'
  const ship = sale.fulfil === 'ship'

  async function pay() {
    setBusy(true)
    setMsg(null)
    try {
      let r = await auctionApi.pay(token, sale.sale_id)
      if (!r.ok && r.requires_action) {
        if (!publishableKey) throw new Error('The bank asked for a check, but this site cannot show it. Please see the auction desk.')
        const check = await confirmPaymentAction(publishableKey, r.client_secret)
        if (!check.ok) throw new Error(check.error ?? 'The bank did not approve the payment.')
        const done = await auctionApi.complete(token, r.sale.sale_id)
        r = done.sale.payment_status === 'paid' ? { ok: true, sale: done.sale } : { ok: false, error: done.sale.failure_message ?? 'The payment was not completed.', sale: done.sale }
      }
      if (r.ok) setMsg({ tone: 'ok', text: `Paid — ${money(r.sale.total_cents)} for ${title}. Stripe emailed your receipt.` })
      else setMsg({ tone: 'error', text: r.error })
      await onChanged()
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    }
    setBusy(false)
  }

  return (
    <li className="print-break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        {sale.item ? (
          <Link to={`/auction/${sale.item.id}`} className={`${linkText} text-lg`}>
            {title}
          </Link>
        ) : (
          <span className="text-lg font-bold text-ink">{title}</span>
        )}
        <Chip tone={sale.payment_status === 'paid' || sale.payment_status === 'cash' ? 'blue' : sale.payment_status === 'failed' ? 'orange' : 'grey'}>
          {PAYMENT_LABEL[sale.payment_status]}
        </Chip>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-600">{kind}</dt>
        <dd className="text-slate-800">
          {money(sale.amount_cents)}
          {sale.ship_fee_cents ? ` + ${money(sale.ship_fee_cents)} shipping = ${money(sale.total_cents)}` : ''}
        </dd>
        {sale.payment_status === 'paid' && (
          <>
            <dt className="text-slate-600">Paid</dt>
            <dd className="text-slate-800">
              {sale.paid_at ? fmtWhen(sale.paid_at) : 'Yes'} · Stripe emailed your receipt.
            </dd>
          </>
        )}
        {sale.payment_status === 'failed' && (
          <>
            <dt className="text-slate-600">What happened</dt>
            <dd className="text-slate-800">{sale.failure_message ?? 'The card was declined.'}</dd>
          </>
        )}
        <dt className="text-slate-600">{ship ? 'Shipping' : 'Pickup'}</dt>
        <dd className="text-slate-800">
          {FULFIL_LABEL[sale.fulfil_status]}
          {ship && sale.tracking ? ` · Tracking ${sale.tracking}` : ''}
          {ship && sale.shipped_at ? ` · ${fmtWhen(sale.shipped_at)}` : ''}
          {!ship && sale.fulfil_status === 'pending' && (pickupNote ? ` · ${pickupNote}` : ' · At the auction table at BunFest.')}
          {!ship && fulfil === 'ship' && sale.fulfil_status === 'pending' && ' (This item is pickup only.)'}
        </dd>
        {sale.note && (
          <>
            <dt className="text-slate-600">Note from OHRR</dt>
            <dd className="text-slate-800">{sale.note}</dd>
          </>
        )}
      </dl>
      {(sale.payment_status === 'failed' || sale.payment_status === 'pending') && (
        <div className="no-print mt-3 space-y-3">
          <button type="button" onClick={pay} disabled={busy} className={`${btn.primary} disabled:opacity-60`}>
            {busy ? 'Paying…' : `Pay ${money(sale.total_cents)} now`}
          </button>
          <p className="text-sm text-slate-700">Charged to the card on file. Change the card first if you need to.</p>
        </div>
      )}
      {msg && (
        <div className="mt-3">
          <Message tone={msg.tone}>{msg.text}</Message>
        </div>
      )}
    </li>
  )
}

/* ------------------------------------------------------------------- you */

function You({ page, token, onChanged }: { page: MyPage; token: string; onChanged: () => Promise<void> }) {
  const b = page.bidder
  const [editing, setEditing] = useState(false)
  const a = b.address
  return (
    <Card>
      <h2 className="font-display text-xl font-extrabold text-ink">You</h2>
      {editing ? (
        <EditYou bidder={b} token={token} done={async () => { setEditing(false); await onChanged() }} cancel={() => setEditing(false)} />
      ) : (
        <>
          <dl className="mt-2 space-y-1 text-base text-slate-800">
            <div>
              <dt className="sr-only">Bidder number</dt>
              <dd className="font-bold text-ink">Bidder #{b.bidder_no}</dd>
            </div>
            <div>
              <dt className="sr-only">Name</dt>
              <dd>{b.name}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd className="break-all">{b.email}</dd>
            </div>
            {b.phone && (
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>{b.phone}</dd>
              </div>
            )}
            <div>
              <dt className="sr-only">Pickup or shipping</dt>
              <dd>
                {b.fulfil === 'ship' ? 'Ship my wins to me' : 'Pick up at BunFest'}
                {b.fulfil === 'ship' && a && (
                  <span className="block text-slate-700">{[a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(', ')}</span>
                )}
              </dd>
            </div>
          </dl>
          <button type="button" onClick={() => setEditing(true)} className={`${btn.outline} no-print mt-3`}>
            Change
          </button>
        </>
      )}
    </Card>
  )
}

function EditYou({ bidder, token, done, cancel }: { bidder: Bidder; token: string; done: () => Promise<void>; cancel: () => void }) {
  const [name, setName] = useState(bidder.name)
  const [phone, setPhone] = useState(bidder.phone ?? '')
  const [fulfil, setFulfil] = useState<Fulfil>(bidder.fulfil)
  const [addr, setAddr] = useState<Address>({ line1: '', line2: '', city: '', state: '', zip: '', ...bidder.address })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Please give your name.')
    if (fulfil === 'ship' && (!addr.line1?.trim() || !addr.city?.trim() || !addr.state?.trim() || !addr.zip?.trim())) {
      return setError('Please give the street, city, state and ZIP code.')
    }
    setBusy(true)
    try {
      await updateBidder(supabase, token, {
        name: name.trim(),
        phone: phone.trim(),
        fulfil,
        address: fulfil === 'ship' ? { ...addr, line2: addr.line2?.trim() || undefined } : null,
      })
      await done()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-4">
      <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      <Field label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" optional />
      <fieldset>
        <legend className="text-base font-bold text-ink">How will you get what you win?</legend>
        <div className="mt-2 space-y-3">
          <Choice name="fulfil" value="pickup" checked={fulfil === 'pickup'} onChange={() => setFulfil('pickup')} label="Pick up at BunFest" />
          <Choice name="fulfil" value="ship" checked={fulfil === 'ship'} onChange={() => setFulfil('ship')} label="Ship it to me" />
        </div>
      </fieldset>
      {fulfil === 'ship' && (
        <div className="space-y-4">
          <Field label="Street address" value={addr.line1 ?? ''} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" required />
          <Field label="Apartment, suite, etc." value={addr.line2 ?? ''} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" optional />
          <Field label="City" value={addr.city ?? ''} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" required />
          <Field label="State" value={addr.state ?? ''} onChange={(e) => setAddr({ ...addr, state: e.target.value })} autoComplete="address-level1" required />
          <Field label="ZIP code" value={addr.zip ?? ''} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} autoComplete="postal-code" inputMode="numeric" required />
        </div>
      )}
      {error && <Message tone="error">{error}</Message>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={`${btn.primary} disabled:opacity-60`}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={cancel} disabled={busy} className={btn.outline}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ---------------------------------------------------------- card on file */

function CardOnFile({ page, token, onChanged }: { page: MyPage; token: string; onChanged: () => Promise<void> }) {
  const b = page.bidder
  const pk = page.settings?.stripe_publishable_key ?? null
  const [secret, setSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function change() {
    setBusy(true)
    setError(null)
    try {
      const r = await auctionApi.newCard(token)
      setSecret(r.client_secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
    setBusy(false)
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-extrabold text-ink">Card on file</h2>
      <p className="mt-2 text-base text-slate-800">
        {b.card_ready && b.card_last4 ? `${cap(b.card_brand ?? 'Card')} ending ${b.card_last4}` : 'No card saved yet — add one to bid.'}
      </p>
      <p className="text-sm text-slate-700">Held by Stripe, not OHRR. Charged only if you win or use Buy now.</p>
      {secret && pk ? (
        <div className="no-print mt-3">
          <CardSetup
            publishableKey={pk}
            clientSecret={secret}
            buttonClassName={`${btn.primary} w-full disabled:opacity-60`}
            label="Save this card"
            onSaved={async (id) => {
              await auctionApi.cardSaved(token, id)
              setSecret(null)
              await onChanged()
            }}
          />
          <button type="button" onClick={() => setSecret(null)} className={`${btn.outline} mt-3`}>
            Keep the old card
          </button>
        </div>
      ) : (
        <div className="no-print mt-3 space-y-3">
          <button type="button" onClick={change} disabled={busy || !pk} className={`${btn.outline} disabled:opacity-60`}>
            {busy ? 'One moment…' : b.card_ready ? 'Change card' : 'Add a card'}
          </button>
          {!pk && <p className="text-sm text-slate-700">Cards can be changed once online bidding is open.</p>}
          {error && <Message tone="error">{error}</Message>}
        </div>
      )}
    </Card>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* --------------------------------------------------------- private link */

function PrivateLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/auction/me/${token}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 3000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Card>
      <h2 className="font-display text-xl font-extrabold text-ink">Your private link</h2>
      <p className="mt-2 text-base text-slate-800">Open this page on another device with this link. Keep it to yourself — anyone with it can bid as you.</p>
      <p className="mt-2 break-all text-sm text-slate-700">{url}</p>
      <button type="button" onClick={copy} className={`${btn.outline} no-print mt-3`}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </Card>
  )
}
