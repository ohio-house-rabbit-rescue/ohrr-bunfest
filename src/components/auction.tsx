// The pieces the silent-auction pages share: the on/off gate, the "how it
// works" box, an item's photo, its shipping line, plain form fields and the
// messages a bidder is told after pressing a button.
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Icon } from './icons'
import { Card, Container, Loading, Note, PageTitle, btn, linkText } from './ui'
import { useSilentAuctionOn } from '../lib/data'
import { itemPhotos } from '../lib/auction'
import { fmtWhen, money, type AuctionItem, type AuctionSettings, type RememberedBidder } from '../lib/auctionClient'

/* ------------------------------------------------------- the on/off switch */

/** What every auction address shows while OHRR has the Silent Auction switched off. */
export function AuctionClosed() {
  return (
    <>
      <PageTitle title="Silent auction" icon="award" />
      <Container className="mt-8 max-w-2xl space-y-4">
        <Note>
          <strong>The silent auction isn't open right now.</strong>
        </Note>
        <Link to="/" className={btn.blue}>
          <Icon name="arrowLeft" size={20} /> Back to Midwest BunFest
        </Link>
      </Container>
    </>
  )
}

/**
 * Around every auction route: the page itself while the Silent Auction is on,
 * the closed page while it's off, and only a loading line while the switch is
 * read — so nothing about the auction shows and then vanishes.
 */
export function AuctionGate() {
  const on = useSilentAuctionOn()
  if (on === undefined) {
    return (
      <Container>
        <Loading what="the silent auction" />
      </Container>
    )
  }
  return on ? <Outlet /> : <AuctionClosed />
}

/** Show `children` only once the Silent Auction switch is read and on. */
export function IfAuctionOn({ children }: { children: ReactNode }) {
  return useSilentAuctionOn() === true ? <>{children}</> : null
}

/** The rules of online bidding, in plain words — true whether bidding is open yet or not. */
export function HowBiddingWorks({ settings }: { settings: AuctionSettings | null }) {
  const open = !!settings?.bidding_enabled && !!settings.stripe_publishable_key
  const extend = settings?.extend_minutes ?? 5
  return (
    <Card className="print-break-inside-avoid bg-brand-blue-50/40">
      <h2 className="font-display text-xl font-extrabold text-ink">How bidding works</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-base text-slate-800">
        <li>
          <strong>Register once</strong> with your name, email and a card. The card is held by Stripe — OHRR never sees the number —
          and it's charged only if you win or use Buy now.
        </li>
        <li>
          <strong>Bid online</strong> on any item until its session closes
          {settings?.morning_closes_at || settings?.afternoon_closes_at ? (
            <>
              {' '}
              (
              {[
                settings.morning_closes_at ? `morning items ${fmtWhen(settings.morning_closes_at)}` : null,
                settings.afternoon_closes_at ? `afternoon items ${fmtWhen(settings.afternoon_closes_at)}` : null,
              ]
                .filter(Boolean)
                .join(', ')}
              )
            </>
          ) : null}
          . On the day you can also bid at the auction table.
        </li>
        {extend > 0 && (
          <li>
            <strong>Going once:</strong> a bid in the last {extend} minutes keeps that item open {extend} more minutes, so nobody loses
            to a last-second bid.
          </li>
        )}
        <li>
          <strong>Buy now</strong> ends the bidding on an item at the price shown — it's yours straight away.
        </li>
        <li>
          <strong>Winners are charged automatically</strong> on the card they registered when their session closes, and can see every
          bid and win on their own page.
        </li>
        <li>
          <strong>Pick up at BunFest</strong>, or have it shipped for the flat fee shown on the item.
        </li>
      </ol>
      {settings?.bidding_note && <p className="mt-3 whitespace-pre-line text-base text-slate-800">{settings.bidding_note}</p>}
      {!open && (
        <p className="mt-3 text-base font-semibold text-slate-800">
          Online bidding opens before the festival; on the day, bid at the auction table.
        </p>
      )}
    </Card>
  )
}

/** "You're Bidder #12 · Your bids" | "Register to bid" | the not-yet line. */
export function BidderBar({
  me,
  settings,
  next,
}: {
  me: RememberedBidder | null
  settings: AuctionSettings | null
  next?: string
}) {
  const open = !!settings?.bidding_enabled && !!settings.stripe_publishable_key
  if (me) {
    return (
      <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-base">
        <span className="font-bold text-ink">
          You're Bidder #{me.bidder_no}
          {me.name ? ` (${me.name})` : ''}
        </span>
        <Link to="/auction/me" className={`${linkText} inline-flex min-h-12 items-center`}>
          Your bids and wins
        </Link>
      </div>
    )
  }
  if (open) {
    return (
      <div className="no-print flex flex-wrap items-center gap-4">
        <Link to={`/auction/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className={btn.primary}>
          <Icon name="gavel" size={22} /> Register to bid
        </Link>
        <span className="text-base text-slate-700">Takes a minute. You'll need a card.</span>
        {settings?.bidding_opens_at && new Date(settings.bidding_opens_at).getTime() > Date.now() && (
          <span className="text-base text-slate-700">Bidding opens {fmtWhen(settings.bidding_opens_at)}.</span>
        )}
      </div>
    )
  }
  return null
}

/** The item's cover photo (lists and cards show only the cover), or a plain tile. */
export function ItemPhoto({ item, className = 'aspect-[4/3] w-full' }: { item: AuctionItem; className?: string }) {
  const cover = itemPhotos(item)[0]
  return cover ? (
    <img src={cover} alt={item.title} loading="lazy" className={`${className} object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-fest-50 text-fest-dark`}>
      <Icon name="gift" size={48} />
    </div>
  )
}

/** "Ships for +$12" or "Pickup only" — only known once the bidding functions answer. */
export function shipLine(item: AuctionItem): string {
  return item.ship_fee_cents == null ? 'Pickup at BunFest only' : `Pickup, or ships for +${money(item.ship_fee_cents)}`
}

/* ------------------------------------------------------------- forms */

export function Field({
  label,
  hint,
  optional,
  ...input
}: { label: string; hint?: string; optional?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-base font-bold text-ink">
        {label}
        {optional && <span className="font-normal text-slate-600"> (optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-slate-600">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 block min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-base text-ink focus:border-brand-blue"
        {...input}
      />
    </div>
  )
}

/** A big, labelled choice — pickup or shipping. */
export function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  detail,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  label: string
  detail?: ReactNode
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 text-base ${
        checked ? 'border-brand-blue bg-brand-blue-50' : 'border-slate-300 bg-white'
      }`}
    >
      <input id={id} type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1.5 h-5 w-5 shrink-0 accent-brand-blue" />
      <span>
        <span className="block font-bold text-ink">{label}</span>
        {detail && <span className="block text-slate-700">{detail}</span>}
      </span>
    </label>
  )
}

/** What happened after a button: read out to a screen reader as it appears. */
export function Message({ tone, children }: { tone: 'ok' | 'error' | 'info'; children: ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-green-300 bg-green-50 text-green-950'
      : tone === 'error'
        ? 'border-red-300 bg-red-50 text-red-950'
        : 'border-slate-200 bg-slate-50 text-slate-800'
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border-2 p-4 text-base ${cls}`}>
      {children}
    </div>
  )
}
