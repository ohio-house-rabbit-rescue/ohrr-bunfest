import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Card, Container, LoadError, Loading, Note, PageTitle, btn, linkText } from '../components/ui'
import { Choice, Field, Message } from '../components/auction'
import CardSetup from '../components/CardSetup'
import { useFestival } from '../lib/data'
import { remember, safeNext, useCatalog, useRemembered } from '../lib/auction'
import { auctionApi, type Address, type Bidder, type Fulfil } from '../lib/auctionClient'

// Register to bid: who you are, pickup or shipping, then a card with Stripe.
// Two short steps (three with a shipping address), never more than six fields
// on the screen at once.

type Step = 'about' | 'address' | 'card'

export default function AuctionRegister() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const f = useFestival()
  const c = useCatalog(f.festival?.slug)
  const me = useRemembered()
  const settings = c.catalog?.settings ?? null
  const crumbs = [
    { to: '/festival', label: 'At the festival' },
    { to: '/auction', label: 'Silent auction' },
  ]

  if (f.error || c.error) {
    return (
      <>
        <PageTitle title="Register to bid" crumbs={crumbs} />
        <Container>
          <LoadError retry={f.error ? f.retry : c.retry} what="the auction" />
        </Container>
      </>
    )
  }
  if (!c.catalog) {
    return (
      <>
        <PageTitle title="Register to bid" crumbs={crumbs} />
        <Container>
          <Loading what="the auction" />
        </Container>
      </>
    )
  }
  if (!settings || !settings.bidding_enabled || !settings.stripe_publishable_key) {
    return (
      <>
        <PageTitle title="Register to bid" icon="gavel" crumbs={crumbs} />
        <Container className="mt-8 max-w-2xl space-y-4">
          <Note>
            <strong>Bidding hasn't opened yet.</strong> Online bidding opens before the festival; on the day, you can bid at the auction
            table. The items are on the auction page now.
          </Note>
          <Link to="/auction" className={btn.blue}>
            <Icon name="arrowLeft" size={20} /> Back to the auction
          </Link>
        </Container>
      </>
    )
  }

  return (
    <>
      <PageTitle
        title="Register to bid"
        icon="gavel"
        crumbs={crumbs}
        intro="Once, for every item. A card is saved now and charged only if you win or use Buy now. OHRR never sees the card number — Stripe holds it."
      />
      <Container className="mt-8 max-w-2xl space-y-6">
        {me && (
          <Note>
            This device is already registered as Bidder #{me.bidder_no}
            {me.name ? ` (${me.name})` : ''}.{' '}
            <Link to="/auction/me" className={linkText}>
              See your bids
            </Link>
            , or register someone else below.
          </Note>
        )}
        <Wizard publishableKey={settings.stripe_publishable_key} pickupNote={settings.pickup_note} shippingNote={settings.shipping_note} next={next} />
      </Container>
    </>
  )
}

function Wizard({
  publishableKey,
  pickupNote,
  shippingNote,
  next,
}: {
  publishableKey: string
  pickupNote: string | null
  shippingNote: string | null
  next: string
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('about')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfil, setFulfil] = useState<Fulfil>('pickup')
  const [addr, setAddr] = useState<Address>({ line1: '', line2: '', city: '', state: '', zip: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reg, setReg] = useState<{ bidder: Bidder; client_secret: string } | null>(null)

  const steps = fulfil === 'ship' ? 3 : 2
  const stepNo = step === 'about' ? 1 : step === 'address' ? 2 : steps

  function aboutDone(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Please give your name.')
    if (!email.includes('@')) return setError('Please give an email address.')
    if (fulfil === 'ship') setStep('address')
    else void register()
  }

  function addressDone(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!addr.line1?.trim() || !addr.city?.trim() || !addr.state?.trim() || !addr.zip?.trim()) {
      return setError('Please give the street, city, state and ZIP code.')
    }
    void register()
  }

  async function register() {
    setBusy(true)
    setError(null)
    try {
      const r = await auctionApi.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        fulfil,
        address: fulfil === 'ship' ? { ...addr, line2: addr.line2?.trim() || undefined } : null,
      })
      setReg(r)
      setStep('card')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
    setBusy(false)
  }

  return (
    <Card>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
        Step {stepNo} of {steps}
      </p>

      {step === 'about' && (
        <form onSubmit={aboutDone} className="mt-2 space-y-5">
          <h2 className="font-display text-2xl font-black text-ink">About you</h2>
          <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            hint="Your receipt goes here if you win."
          />
          <Field label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" optional />
          <fieldset>
            <legend className="text-base font-bold text-ink">How will you get what you win?</legend>
            <div className="mt-2 space-y-3">
              <Choice
                name="fulfil"
                value="pickup"
                checked={fulfil === 'pickup'}
                onChange={() => setFulfil('pickup')}
                label="I'll pick it up at BunFest"
                detail={pickupNote ?? 'At the auction table on the day.'}
              />
              <Choice
                name="fulfil"
                value="ship"
                checked={fulfil === 'ship'}
                onChange={() => setFulfil('ship')}
                label="Ship it to me"
                detail={shippingNote ?? 'A flat fee per item, shown on each item. Some items are pickup only.'}
              />
            </div>
          </fieldset>
          {error && <Message tone="error">{error}</Message>}
          <button type="submit" disabled={busy} className={`${btn.primary} w-full disabled:opacity-60`}>
            {busy ? 'One moment…' : fulfil === 'ship' ? 'Next: shipping address' : 'Next: your card'}
          </button>
        </form>
      )}

      {step === 'address' && (
        <form onSubmit={addressDone} className="mt-2 space-y-5">
          <h2 className="font-display text-2xl font-black text-ink">Shipping address</h2>
          <Field label="Street address" value={addr.line1 ?? ''} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" required />
          <Field label="Apartment, suite, etc." value={addr.line2 ?? ''} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" optional />
          <Field label="City" value={addr.city ?? ''} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="State" value={addr.state ?? ''} onChange={(e) => setAddr({ ...addr, state: e.target.value })} autoComplete="address-level1" required />
            <Field label="ZIP code" value={addr.zip ?? ''} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} autoComplete="postal-code" inputMode="numeric" required />
          </div>
          {error && <Message tone="error">{error}</Message>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={`${btn.primary} disabled:opacity-60`}>
              {busy ? 'One moment…' : 'Next: your card'}
            </button>
            <button type="button" onClick={() => setStep('about')} disabled={busy} className={btn.outline}>
              Back
            </button>
          </div>
        </form>
      )}

      {step === 'card' && reg && (
        <div className="mt-2 space-y-5">
          <h2 className="font-display text-2xl font-black text-ink">Your card</h2>
          <p className="text-base text-slate-800">
            You're Bidder #{reg.bidder.bidder_no}. Save a card to finish — Stripe holds it, and it's charged only if you win or use Buy now.
          </p>
          <CardSetup
            publishableKey={publishableKey}
            clientSecret={reg.client_secret}
            buttonClassName={`${btn.primary} w-full disabled:opacity-60`}
            label="Save card and start bidding"
            onSaved={async (setupIntentId) => {
              const { bidder } = await auctionApi.cardSaved(reg.bidder.access_token, setupIntentId)
              remember(bidder)
              navigate(next)
            }}
          />
        </div>
      )}
    </Card>
  )
}
