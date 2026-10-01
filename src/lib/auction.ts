// Online bidding: what the auction pages need beyond the shared client
// (auctionClient.ts) — reads that refresh themselves while bidding is open,
// the fallback for a database that hasn't had update 35 yet, the bidder this
// device remembers, and a clock that follows the server's.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useAuction, type AuctionItem as ListedItem } from './data'
import {
  fetchCatalog,
  forgetBidder,
  recallBidder,
  rememberBidder,
  type AuctionItem,
  type AuctionSettings,
  type Bidder,
  type RememberedBidder,
  type Session,
} from './auctionClient'

/** How often an open catalog, item or "my bids" page asks for news. */
export const POLL_MS = 15_000

/* ------------------------------------------------------------- polling */

export interface Polled<T> {
  data: T | null
  /** Set only when there is nothing to show; a failed refresh keeps the last answer. */
  error: string | null
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Read now, then again every `everyMs` while the tab is visible. `key` null
 * means "not yet"; `everyMs` null means "once". Unlike useLoad, nothing is
 * cached between visits — bids change by the minute.
 */
export function usePoll<T>(key: string | null, fn: () => Promise<T>, everyMs: number | null): Polled<T> {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const load = useCallback(async () => {
    if (!key) return
    try {
      const v = await fnRef.current()
      setState({ key, data: v, error: null })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      setState((s) => (s.key === key && s.data !== null ? s : { key, data: null, error: message }))
    }
  }, [key])
  useEffect(() => {
    if (!key) return
    let active = true
    const run = () => {
      if (active && !document.hidden) void load()
    }
    void load()
    if (!everyMs) {
      return () => {
        active = false
      }
    }
    const t = window.setInterval(run, everyMs)
    document.addEventListener('visibilitychange', run)
    return () => {
      active = false
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', run)
    }
  }, [key, everyMs, load])
  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !!key && !current,
    refresh: load,
  }
}

/* ------------------------------------------------------------- catalog */

export interface CatalogState {
  /** The server's clock at the last read (ISO). */
  now: string
  settings: AuctionSettings | null
  items: AuctionItem[]
  /** True when the bidding functions answered; false = the plain item list (no bids, no prices). */
  live: boolean
  /** False when auction_catalog() says the Silent Auction is switched off (update 38). */
  enabled: boolean
}

/** An item's photos, cover first: photo_urls when there are any, else the one photo_url. */
export function itemPhotos(item: Pick<AuctionItem, 'photo_url' | 'photo_urls'>): string[] {
  const all = (Array.isArray(item.photo_urls) ? item.photo_urls : []).filter((u) => typeof u === 'string' && u.trim() !== '')
  if (all.length > 0) return all
  return item.photo_url ? [item.photo_url] : []
}

export interface CatalogRead {
  catalog: CatalogState | null
  /** The ticket-raffle prizes and OHRR's intro, from the plain read. */
  prizes: ListedItem[]
  intro: string | null
  error: string | null
  loading: boolean
  refresh: () => Promise<void>
  retry: () => void
}

/** "Could not find the function public.auction_catalog…" — update 35 isn't on this database. */
export function isMissingFunction(message: string): boolean {
  return /could not find the function|schema cache|does not exist/i.test(message)
}

const SESSIONS: Session[] = ['morning', 'afternoon', 'all-day']

/** A plain listed item in the bidding shape, for a database without update 35. */
export function fromListed(i: ListedItem): AuctionItem {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    donated_by: i.donatedBy,
    value_cents: i.valueCents,
    photo_url: i.photoUrl,
    photo_urls: i.photoUrls ?? null,
    session: (SESSIONS as string[]).includes(i.session) ? (i.session as Session) : 'all-day',
    status: i.status === 'won' ? 'won' : 'available',
    won_kind: null,
    sort_order: 0,
    starting_bid_cents: null,
    increment_cents: 500,
    buy_now_cents: null,
    ship_fee_cents: null,
    current_bid_cents: null,
    next_min_cents: 0,
    bid_count: 0,
    high_bidder_no: null,
    closes_at: null,
    is_open: false,
  }
}

/**
 * The catalog with bids and prices (auction_catalog, refreshed every 15 s),
 * falling back to the plain item list when that function isn't there yet —
 * the page never breaks. Prizes and the intro always come from the plain read.
 */
export function useCatalog(slug: string | undefined): CatalogRead {
  const [unavailable, setUnavailable] = useState(false)
  const rpc = usePoll(slug && !unavailable ? `catalog:${slug}` : null, () => fetchCatalog(supabase, slug!), POLL_MS)
  useEffect(() => {
    if (rpc.error && isMissingFunction(rpc.error)) setUnavailable(true)
  }, [rpc.error])
  const listed = useAuction(slug)

  const prizes = listed.data?.prizes ?? []
  const intro = listed.data?.settings.intro ?? null

  if (rpc.data) {
    // Before update 38 the catalog carries only the cover; the plain read has every photo.
    const photos = new Map((listed.data?.items ?? []).map((i) => [i.id, i.photoUrls ?? null]))
    const items = (rpc.data.items ?? []).map((i) => (i.photo_urls !== undefined ? i : { ...i, photo_urls: photos.get(i.id) ?? null }))
    return {
      catalog: { now: rpc.data.now, settings: rpc.data.settings, items, live: true, enabled: rpc.data.enabled !== false },
      prizes,
      intro,
      error: null,
      loading: false,
      refresh: rpc.refresh,
      retry: rpc.refresh,
    }
  }
  const fallingBack = unavailable || !!rpc.error
  if (fallingBack && listed.data) {
    return {
      catalog: { now: new Date().toISOString(), settings: null, items: listed.data.items.map(fromListed), live: false, enabled: true },
      prizes,
      intro,
      error: null,
      loading: false,
      refresh: rpc.refresh,
      retry: listed.retry,
    }
  }
  return {
    catalog: null,
    prizes,
    intro,
    error: fallingBack ? listed.error : null,
    loading: !fallingBack || listed.loading,
    refresh: rpc.refresh,
    retry: fallingBack ? listed.retry : rpc.refresh,
  }
}

/* --------------------------------------------------- the remembered bidder */

const CHANGED = 'ohrr.auction.bidder-changed'

/** Remember (or forget, with null) the bidder and tell every open page on this tab. */
export function remember(b: Bidder | null): void {
  if (b) rememberBidder(b)
  else forgetBidder()
  window.dispatchEvent(new Event(CHANGED))
}

/** The bidder this device registered, kept current across pages and tabs. */
export function useRemembered(): RememberedBidder | null {
  const [b, setB] = useState<RememberedBidder | null>(() => recallBidder())
  useEffect(() => {
    const check = () => setB(recallBidder())
    window.addEventListener('storage', check)
    window.addEventListener('focus', check)
    window.addEventListener(CHANGED, check)
    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener('focus', check)
      window.removeEventListener(CHANGED, check)
    }
  }, [])
  return b
}

/* ----------------------------------------------------------------- clock */

/**
 * The server's clock, ticking on: `serverNow` came with the last read, so a
 * visitor whose phone is minutes off still sees the right countdown.
 */
export function useServerNow(serverNow: string | null): string {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const t = window.setInterval(tick, 20_000)
    return () => window.clearInterval(t)
  }, [])
  const offset = useMemo(() => (serverNow ? new Date(serverNow).getTime() - Date.now() : 0), [serverNow])
  return new Date(Date.now() + offset).toISOString()
}

/** "25" or "12.50" — cents as the number a person types. */
export function centsToDollars(cents: number): string {
  const d = cents / 100
  return Number.isInteger(d) ? String(d) : d.toFixed(2)
}

/** Only a page on this site may be the way back after registering. */
export function safeNext(v: string | null, fallback = '/auction'): string {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : fallback
}
