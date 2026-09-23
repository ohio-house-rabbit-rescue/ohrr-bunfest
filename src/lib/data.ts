// Everything this site shows, read from the same database as the OHRR app and
// the OHRR website. Nothing is typed in here: the festival, its programme,
// pages, vendors, rescues, sponsors, auction and floor plan are all edited by
// OHRR staff (the app: Staff → BunFest; the website: Staff → BunFest) and
// appear here as soon as they're saved.
//
// Each read is cached for the visit, so moving between pages doesn't reload
// what's already on screen. If a read fails the page says so and offers to
// try again — it never shows made-up stand-in content.
import { useCallback, useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, errMessage } from './supabase'
import { yearOf } from './format'
import { OHRR_EMAIL_FALLBACK } from './links'
import {
  MAKOY_2026,
  buildBlocks,
  parseVenue,
  placeTables,
  roomOfTable,
  tablesOf,
  type Block,
  type HolderKind,
  type PlacedTable,
  type TableAssignment,
  type Venue,
} from './floor'

/* --------------------------------------------------------------- loading */

type Entry = { status: 'loading' | 'ok' | 'error'; value?: unknown; error?: string; promise: Promise<void> }
const cache = new Map<string, Entry>()

function start(key: string, fn: () => Promise<unknown>): Entry {
  const existing = cache.get(key)
  if (existing) return existing
  const entry: Entry = { status: 'loading', promise: Promise.resolve() }
  entry.promise = fn().then(
    (v) => {
      entry.status = 'ok'
      entry.value = v
    },
    (e) => {
      entry.status = 'error'
      entry.error = errMessage(e)
    },
  )
  cache.set(key, entry)
  return entry
}

export interface Loadable<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  retry: () => void
}

/** Read once per visit; `key` null means "not yet" (waiting on something else). */
export function useLoad<T>(key: string | null, fn: () => Promise<T>): Loadable<T> {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const entry = key ? start(key, fn) : null
  useEffect(() => {
    if (!entry || entry.status !== 'loading') return
    let active = true
    entry.promise.then(() => {
      if (active) rerender()
    })
    return () => {
      active = false
    }
  }, [entry])
  const retry = useCallback(() => {
    if (!key) return
    cache.delete(key)
    rerender()
  }, [key])
  return {
    data: entry?.status === 'ok' ? (entry.value as T) : undefined,
    loading: !entry || entry.status === 'loading',
    error: entry?.status === 'error' ? (entry.error ?? 'Something went wrong.') : null,
    retry,
  }
}

async function rows<T>(p: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await p
  if (error) throw error
  return (Array.isArray(data) ? data : []) as T[]
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/* -------------------------------------------------------------- festival */

export interface FestivalInfo {
  admission: { who: string; price: string }[]
  admissionNote?: string
  parking?: string
  rabbitRule?: string
  ticketsUrl?: string
  hotelUrl?: string
  volunteerUrl?: string
  merchUrl?: string
  logoCredit?: string
}

export interface Festival {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  venue: string | null
  address: string | null
  city: string | null
  summary: string | null
  body: string | null
  theme: string | null
  url: string | null
  imageUrl: string | null
  year: number
  info: FestivalInfo
}

interface EventRow {
  id: string
  slug: string
  title: string
  starts_at: string
  ends_at: string | null
  venue: string | null
  address: string | null
  city: string | null
  summary: string | null
  body: string | null
  theme: string | null
  url: string | null
  image_url: string | null
  info: unknown
}

function toInfo(v: unknown): FestivalInfo {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const admission = Array.isArray(o.admission)
    ? (o.admission as { who?: unknown; price?: unknown }[])
        .filter((a) => a && str(a.who) && str(a.price))
        .map((a) => ({ who: String(a.who), price: String(a.price) }))
    : []
  return {
    admission,
    admissionNote: str(o.admission_note),
    parking: str(o.parking),
    rabbitRule: str(o.rabbit_rule),
    ticketsUrl: str(o.tickets_url),
    hotelUrl: str(o.hotel_url),
    volunteerUrl: str(o.volunteer_url),
    merchUrl: str(o.merch_url),
    logoCredit: str(o.logo_credit),
  }
}

async function fetchFestivals(): Promise<Festival[]> {
  const data = await rows<EventRow>(
    supabase
      .from('events')
      .select('id,slug,title,starts_at,ends_at,venue,address,city,summary,body,theme,url,image_url,info')
      .eq('is_published', true)
      .ilike('slug', '%bunfest%')
      .order('starts_at', { ascending: true }),
  )
  return data.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venue: r.venue,
    address: r.address,
    city: r.city,
    summary: r.summary,
    body: r.body,
    theme: r.theme,
    url: r.url,
    imageUrl: r.image_url,
    year: yearOf(r.starts_at),
    info: toInfo(r.info),
  }))
}

export interface FestivalState extends Loadable<Festival[]> {
  /** The next festival, or the last one once it has passed. */
  festival: Festival | undefined
  /** True once the day is over. */
  over: boolean
}

export function useFestival(): FestivalState {
  const all = useLoad('festivals', fetchFestivals)
  const list = all.data ?? []
  const now = Date.now()
  const upcoming = list.find((f) => new Date(f.endsAt ?? f.startsAt).getTime() >= now)
  const festival = upcoming ?? list[list.length - 1]
  return { ...all, festival, over: !!festival && !upcoming }
}

/**
 * The year a page shows: `?year=2025` for the archive, otherwise the current
 * festival's. Undefined until the festival has loaded.
 */
export function useShownYear(): { year: number | undefined; current: number | undefined; isPast: boolean } {
  const [params] = useSearchParams()
  const { festival } = useFestival()
  const asked = Number(params.get('year'))
  const current = festival?.year
  const year = Number.isInteger(asked) && asked > 2000 ? asked : current
  return { year, current, isPast: year !== undefined && current !== undefined && year < current }
}

/* ------------------------------------------------ the festival's cards */

export interface Feature {
  id: string
  title: string
  blurb: string | null
  icon: string | null
  link: string | null
}

export function useFeatures(year: number | undefined): Loadable<Feature[]> {
  return useLoad(year ? `features:${year}` : null, async () =>
    (
      await rows<{ id: string; title: string; blurb: string | null; icon: string | null; link_url: string | null }>(
        supabase
          .from('event_features')
          .select('id,title,blurb,icon,link_url')
          .eq('year', year!)
          .eq('is_published', true)
          .order('sort_order'),
      )
    ).map((r) => ({ id: r.id, title: r.title, blurb: r.blurb, icon: r.icon, link: r.link_url })),
  )
}

/* ------------------------------------------------ the festival's pages */

export interface PageSection {
  heading?: string
  body?: string
  list?: string[]
  slot?: 'raffle-details'
}

export interface FestivalPage {
  id: string
  year: number
  slug: string
  title: string
  subtitle: string | null
  icon: string | null
  sponsorNote: string | null
  chips: string[]
  note: string | null
  sections: PageSection[]
  feature: 'reserve' | 'raffle' | null
  reserveClosedNote: string | null
  emailSignup: string | null
  contact: { address?: string; phone?: string; url?: string; urlLabel?: string } | null
  relatedLabel: string | null
  related: { label: string; to: string }[]
}

interface PageRow {
  id: string
  year: number
  slug: string
  title: string
  subtitle: string | null
  icon: string | null
  sponsor_note: string | null
  chips: string[] | null
  note: string | null
  sections: unknown
  feature: 'reserve' | 'raffle' | null
  reserve: unknown
  email_signup: string | null
  contact: unknown
  related_label: string | null
  related: unknown
}

function toPage(r: PageRow): FestivalPage {
  const sections = Array.isArray(r.sections)
    ? (r.sections as Record<string, unknown>[])
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({
          heading: str(s.heading),
          body: str(s.body),
          list: Array.isArray(s.list) ? s.list.filter((i): i is string => typeof i === 'string' && !!i.trim()) : undefined,
          slot: s.slot === 'raffle-details' ? ('raffle-details' as const) : undefined,
        }))
        .filter((s) => s.heading || s.body || (s.list && s.list.length > 0))
    : []
  const c = r.contact && typeof r.contact === 'object' ? (r.contact as Record<string, unknown>) : null
  const contact = c
    ? { address: str(c.address), phone: str(c.phone), url: str(c.url), urlLabel: str(c.urlLabel) }
    : null
  const reserve = r.reserve && typeof r.reserve === 'object' ? (r.reserve as Record<string, unknown>) : null
  const related = Array.isArray(r.related)
    ? (r.related as Record<string, unknown>[])
        .map((x) => ({ label: str(x?.label) ?? '', to: str(x?.to) ?? '' }))
        .filter((x) => x.label && x.to)
    : []
  return {
    id: r.id,
    year: r.year,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    icon: r.icon,
    sponsorNote: str(r.sponsor_note) ?? null,
    chips: (r.chips ?? []).filter(Boolean),
    note: str(r.note) ?? null,
    sections,
    feature: r.feature,
    reserveClosedNote: str(reserve?.closedNote) ?? null,
    emailSignup: str(r.email_signup) ?? null,
    contact: contact && (contact.address || contact.phone || contact.url) ? contact : null,
    relatedLabel: str(r.related_label) ?? null,
    related,
  }
}

export function usePages(year: number | undefined): Loadable<FestivalPage[]> {
  return useLoad(year ? `pages:${year}` : null, async () =>
    (
      await rows<PageRow>(
        supabase
          .from('bunfest_pages')
          .select('id,year,slug,title,subtitle,icon,sponsor_note,chips,note,sections,feature,reserve,email_signup,contact,related_label,related')
          .eq('year', year!)
          .eq('is_published', true)
          .order('sort_order'),
      )
    ).map(toPage),
  )
}

/** Staff-entered raffle details (where tickets are sold, the drawing time …). */
export interface AuctionSettings {
  intro: string | null
  raffleDetails: string | null
}

/* ------------------------------------------------------------ programme */

export interface Session {
  id: string
  start: string
  end: string | null
  title: string
  presenter: string | null
  description: string | null
  room: string | null
  track: string
  presenterIds: string[]
  kind: 'session' | 'break' | 'activity'
}

export function useSessions(year: number | undefined): Loadable<Session[]> {
  return useLoad(year ? `sessions:${year}` : null, async () =>
    (
      await rows<{
        id: string
        start_time: string
        end_time: string | null
        title: string
        presenter: string | null
        description: string | null
        room: string | null
        track: string | null
        presenter_ids: string[] | null
        kind: Session['kind']
      }>(
        supabase
          .from('bunfest_sessions')
          .select('id,start_time,end_time,title,presenter,description,room,track,presenter_ids,kind,sort_order')
          .eq('year', year!)
          .eq('is_published', true)
          .order('start_time')
          .order('sort_order'),
      )
    ).map((r) => ({
      id: r.id,
      start: r.start_time,
      end: r.end_time,
      title: r.title,
      presenter: r.presenter,
      description: r.description,
      room: r.room,
      track: r.track ?? '',
      presenterIds: r.presenter_ids ?? [],
      kind: r.kind,
    })),
  )
}

export interface Presenter {
  id: string
  name: string
  credentials: string | null
  affiliation: string | null
  bio: string | null
  photoUrl: string | null
  website: string | null
}

export function usePresenters(): Loadable<Presenter[]> {
  return useLoad('presenters', async () =>
    (
      await rows<{
        id: string
        name: string
        credentials: string | null
        affiliation: string | null
        bio: string | null
        photo_url: string | null
        website: string | null
      }>(
        supabase
          .from('bunfest_presenters')
          .select('id,name,credentials,affiliation,bio,photo_url,website')
          .eq('is_published', true)
          .order('sort_order')
          .order('name'),
      )
    ).map((r) => ({
      id: r.id,
      name: r.name,
      credentials: r.credentials,
      affiliation: r.affiliation,
      bio: r.bio,
      photoUrl: r.photo_url,
      website: r.website,
    })),
  )
}

/** "Barbara Oglesbee, DVM, DABVP (Avian)" */
export function presenterName(p: Pick<Presenter, 'name' | 'credentials'>): string {
  return p.credentials ? `${p.name}, ${p.credentials}` : p.name
}

/* ------------------------------------------------------ who is coming */

export interface Vendor {
  id: string
  name: string
  category: string
  blurb: string | null
  website: string | null
}

export function useVendors(year: number | undefined): Loadable<Vendor[]> {
  return useLoad(year ? `vendors:${year}` : null, async () => {
    const { data, error } = await supabase.rpc('bunfest_vendors_public', { p_year: year })
    if (error) throw error
    return ((Array.isArray(data) ? data : []) as {
      id: string
      name: string
      category: string | null
      blurb: string | null
      website: string | null
    }[]).map((r) => ({ id: r.id, name: r.name, category: r.category ?? 'Vendors', blurb: r.blurb, website: r.website }))
  })
}

export interface Rescue {
  id: string
  name: string
  location: string | null
  city: string | null
  state: string | null
  region: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  blurb: string | null
  isHost: boolean
  atBunfest: boolean
  years: number[]
}

export function useRescues(): Loadable<Rescue[]> {
  return useLoad('rescues', async () =>
    (
      await rows<{
        id: string
        name: string
        location: string | null
        city: string | null
        state: string | null
        region: string | null
        phone: string | null
        email: string | null
        address: string | null
        website: string | null
        blurb: string | null
        is_host: boolean
        at_bunfest: boolean
        bunfest_years: number[] | null
      }>(
        supabase
          .from('rescue_partners')
          .select('id,name,location,city,state,region,phone,email,address,website,blurb,is_host,at_bunfest,bunfest_years')
          .eq('is_published', true)
          .order('sort_order')
          .order('name'),
      )
    ).map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      city: r.city,
      state: r.state,
      region: r.region,
      phone: r.phone,
      email: r.email,
      address: r.address,
      website: r.website,
      blurb: r.blurb,
      isHost: r.is_host,
      atBunfest: r.at_bunfest,
      years: r.bunfest_years ?? [],
    })),
  )
}

/** A rescue's years at BunFest; untagged rows count for the current year only. */
export function cameIn(r: Rescue, year: number, current: number | undefined): boolean {
  return r.years.length > 0 ? r.years.includes(year) : r.atBunfest && year === current
}

export type SponsorTier = 'presenting' | 'program' | 'community' | 'friend'
export const TIER_ORDER: SponsorTier[] = ['presenting', 'program', 'community', 'friend']
export const TIER_LABEL: Record<SponsorTier, string> = {
  presenting: 'Lead sponsor',
  program: 'Sponsors',
  community: 'Community supporters',
  friend: 'Friends of BunFest',
}

export interface Sponsor {
  id: string
  name: string
  tier: SponsorTier
  blurb: string | null
  logoUrl: string | null
  website: string | null
  sortOrder: number
}

function endOfDay(d: string): number {
  return new Date(`${d.slice(0, 10)}T23:59:59`).getTime()
}
function inTerm(start: string | null, end: string | null, now = Date.now()): boolean {
  if (start && new Date(start).getTime() > now) return false
  if (end && endOfDay(end) < now) return false
  return true
}

/** The sponsors OHRR has placed on BunFest, while their terms last. */
export function useSponsors(): Loadable<Sponsor[]> {
  return useLoad('sponsors', async () => {
    const placements = await rows<{ sponsor_id: string; starts_at: string | null; ends_at: string | null; is_active: boolean | null }>(
      supabase.from('sponsor_placements').select('sponsor_id,starts_at,ends_at,is_active').eq('surface', 'bunfest'),
    )
    const ids = [
      ...new Set(placements.filter((p) => p.is_active !== false && inTerm(p.starts_at, p.ends_at)).map((p) => p.sponsor_id)),
    ]
    if (ids.length === 0) return []
    const sponsors = await rows<{
      id: string
      name: string
      tier: string
      blurb: string | null
      logo_url: string | null
      website: string | null
      term_start: string | null
      term_end: string | null
      is_active: boolean | null
      sort_order: number | null
    }>(supabase.from('sponsors').select('id,name,tier,blurb,logo_url,website,term_start,term_end,is_active,sort_order').in('id', ids))
    return sponsors
      .filter((s) => s.is_active !== false && inTerm(s.term_start, s.term_end))
      .map((s) => ({
        id: s.id,
        name: s.name,
        tier: (TIER_ORDER as string[]).includes(s.tier) ? (s.tier as SponsorTier) : 'friend',
        blurb: s.blurb,
        logoUrl: s.logo_url,
        website: s.website,
        sortOrder: s.sort_order ?? 0,
      }))
      .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  })
}

/* --------------------------------------------------------------- auction */

export interface AuctionItem {
  id: string
  title: string
  description: string | null
  donatedBy: string | null
  valueCents: number | null
  photoUrl: string | null
  session: string
  status: string
}

export interface Auction {
  items: AuctionItem[]
  prizes: AuctionItem[]
  settings: AuctionSettings
}

export function useAuction(eventSlug: string | undefined): Loadable<Auction> {
  return useLoad(eventSlug ? `auction:${eventSlug}` : null, async () => {
    const [items, prizes, settings] = await Promise.all([
      rows<{
        id: string
        title: string
        description: string | null
        donated_by: string | null
        value_cents: number | null
        photo_url: string | null
        session: string | null
        status: string
      }>(
        supabase
          .from('raffle_items')
          .select('id,title,description,donated_by,value_cents,photo_url,session,status')
          .eq('event_slug', eventSlug!)
          .eq('is_published', true)
          .order('sort_order'),
      ),
      rows<{
        id: string
        title: string
        description: string | null
        donated_by: string | null
        value_cents: number | null
        photo_url: string | null
        status: string
      }>(
        supabase
          .from('raffle_prizes')
          .select('id,title,description,donated_by,value_cents,photo_url,status')
          .eq('event_slug', eventSlug!)
          .eq('is_published', true)
          .order('sort_order')
          .order('title'),
      ),
      rows<{ intro_text: string | null; raffle_details: string | null }>(
        supabase.from('auction_settings').select('intro_text,raffle_details').eq('event_slug', eventSlug!).limit(1),
      ),
    ])
    const map = (r: (typeof items)[number] | (typeof prizes)[number], session: string): AuctionItem => ({
      id: r.id,
      title: r.title,
      description: r.description,
      donatedBy: r.donated_by,
      valueCents: r.value_cents,
      photoUrl: r.photo_url,
      session,
      status: r.status,
    })
    return {
      items: items.map((r) => map(r, r.session ?? 'all-day')),
      prizes: prizes.map((r) => map(r, 'raffle')),
      settings: {
        intro: str(settings[0]?.intro_text) ?? null,
        raffleDetails: str(settings[0]?.raffle_details) ?? null,
      },
    }
  })
}

/* ----------------------------------------------------------- floor plan */

export interface Floor {
  year: number
  venue: Venue | null
  tables: PlacedTable[]
  assignments: TableAssignment[]
  blocks: Block[]
  saved: boolean
  placeOf: (kind: HolderKind, id: string) => { numbers: number[]; roomName: string | null }
}

/** The bundled start, only for the year it describes (as in the app). */
function fallbackVenue(year: number): Venue | null {
  return year === 2026 ? MAKOY_2026 : null
}

export function useFloor(year: number | undefined): Loadable<Floor> {
  return useLoad(year ? `floor:${year}` : null, async () => {
    const [venueRes, tablesRes] = await Promise.all([
      supabase.from('bunfest_venues').select('layout').eq('year', year!).maybeSingle(),
      supabase.rpc('bunfest_tables_public', { p_year: year }),
    ])
    if (venueRes.error) throw venueRes.error
    const saved = venueRes.data ? parseVenue((venueRes.data as { layout: unknown }).layout) : null
    const venue = saved ?? fallbackVenue(year!)
    const assignments: TableAssignment[] = (
      (Array.isArray(tablesRes.data) ? tablesRes.data : []) as {
        table_no: number
        kind: HolderKind
        ref_id: string | null
        name: string | null
        category: string | null
      }[]
    ).map((t) => ({ table: t.table_no, kind: t.kind, id: t.ref_id, name: t.name, category: t.category }))
    const tables = venue ? placeTables(venue) : []
    return {
      year: year!,
      venue,
      tables,
      assignments,
      blocks: buildBlocks(tables, assignments),
      saved: !!saved,
      placeOf: (kind: HolderKind, id: string) => {
        const numbers = tablesOf(assignments, kind, id)
        const roomId = numbers.length > 0 ? roomOfTable(tables, numbers[0]) : null
        return { numbers, roomName: venue?.rooms.find((r) => r.id === roomId)?.name ?? null }
      },
    }
  })
}

/* ------------------------------------------------------------ RHDV2 vets */

export interface VaccineVet {
  id: string
  name: string
  doctors: string | null
  address: string | null
  city: string | null
  phone: string | null
  website: string | null
  notes: string | null
  /** How to get the vaccine there ("By appointment — call …"). */
  rhdv2_note: string | null
}

/** Practices OHRR has marked as giving the RHDV2 vaccine. */
export function useRhdv2Vets(): Loadable<VaccineVet[]> {
  return useLoad('rhdv2-vets', () =>
    rows<VaccineVet>(
      supabase
        .from('vets')
        .select('id,name,doctors,address,city,phone,website,notes,rhdv2_note')
        .eq('is_published', true)
        .eq('gives_rhdv2', true)
        .order('sort_order'),
    ),
  )
}

/* ------------------------------------------------------------ OHRR itself */

export interface Org {
  email: string
  ein: string | null
}

/** OHRR's email and EIN from OHRR details (Staff → OHRR details). */
export function useOrg(): Loadable<Org> {
  return useLoad('org', async () => {
    const data = await rows<{ value: Record<string, unknown> | null }>(
      supabase.from('app_settings').select('value').eq('key', 'org_profile').limit(1),
    )
    const v = data[0]?.value ?? {}
    return { email: str(v.email) ?? OHRR_EMAIL_FALLBACK, ein: str(v.ein) ?? null }
  })
}

/* --------------------------------------------------------------- archive */

/** Every year with something kept — programme, pages, cards or rescues. */
export function useArchiveYears(): Loadable<number[]> {
  return useLoad('archive-years', async () => {
    const [s, p, f, r] = await Promise.all([
      rows<{ year: number }>(supabase.from('bunfest_sessions').select('year').eq('is_published', true)),
      rows<{ year: number }>(supabase.from('bunfest_pages').select('year').eq('is_published', true)),
      rows<{ year: number }>(supabase.from('event_features').select('year').eq('is_published', true)),
      rows<{ bunfest_years: number[] | null }>(supabase.from('rescue_partners').select('bunfest_years').eq('is_published', true)),
    ])
    const years = new Set<number>()
    for (const x of [...s, ...p, ...f]) years.add(x.year)
    for (const x of r) for (const y of x.bunfest_years ?? []) years.add(y)
    return [...years].sort((a, b) => b - a)
  })
}
