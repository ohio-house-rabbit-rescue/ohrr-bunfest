// Where things live outside this site, and how the links OHRR types into the
// shared database become links here.
//
// The festival pages, cards and "related" links are written once, in the OHRR
// app (Staff → BunFest), using the app's own paths — "/bunfest/p/spa",
// "/vets?rhdv2=1", "/shop". This site reads the same records, so each of those
// paths is translated to the page that answers it here, or to the OHRR
// website when the answer lives there. Nobody retypes a link for the web.

/** The OHRR website — adopt, volunteer, give, the Hop Shop, the vet list. */
export const OHRR_SITE = 'https://ohrr-website.pages.dev'
/** The OHRR app. */
export const OHRR_APP = 'https://ohrr-app.pages.dev'
/** The official festival site, which this sample leaves untouched. */
export const OFFICIAL_SITE = 'https://www.midwestbunfest.org/'
/** Where OHRR staff edit everything this site shows. */
export const STAFF_EDIT = `${OHRR_SITE}/staff/bunfest`

/** OHRR's email — the way in (the rescue is run by volunteers). */
export const OHRR_EMAIL_FALLBACK = 'ohrrcontact@ohiohouserabbitrescue.org'

/** External links open in a new tab and leave this site where it was. */
export const ext = { target: '_blank', rel: 'noopener' } as const

export type Dest = { to: string } | { href: string }

/** The festival page slugs that have a page of their own here. */
const OWN_PAGE: Record<string, string> = {
  'bringing-bunny': '/your-rabbit',
  'attendance-agreement': '/your-rabbit#agreement',
  volunteer: '/volunteer',
}

/** An app path or a web address → where it should go on this site. */
export function destOf(link: string): Dest {
  const l = link.trim()
  if (/^(https?:|mailto:|tel:)/i.test(l)) return { href: l }
  if (!l.startsWith('/')) return { href: `https://${l}` }

  const [path, query = ''] = l.split('?')
  const params = new URLSearchParams(query)

  if (path === '/bunfest' || path === '/bunfest/') return { to: '/' }
  const page = path.match(/^\/bunfest\/p\/([\w-]+)$/)
  if (page) return { to: OWN_PAGE[page[1]] ?? `/festival/${page[1]}` }
  const map: Record<string, string> = {
    '/bunfest/schedule': '/schedule',
    '/bunfest/speakers': '/speakers',
    '/bunfest/vendors': '/vendors',
    '/bunfest/partners': '/rescues',
    '/bunfest/sponsors': '/sponsors',
    '/bunfest/map': '/map',
    '/bunfest/auction': '/auction',
    '/bunfest/visit': '/visit',
  }
  if (map[path]) return { to: map[path] }
  if (path.startsWith('/bunfest/vendors/')) return { to: '/vendors' }
  if (path.startsWith('/bunfest/partners/')) return { to: '/rescues' }
  if (path === '/vets' && params.get('rhdv2')) return { to: '/your-rabbit#vaccine' }

  // Everything else is OHRR's, and the website has the same page.
  const web: Record<string, string> = {
    '/shop': '/hop-shop',
    '/vets': '/learn/vets',
  }
  return { href: `${OHRR_SITE}${web[path] ?? path}` }
}

/** "example.com" from a web address, for showing a link as readable text. */
export function hostOf(url: string): string {
  try {
    return new URL(/^[a-z]+:/i.test(url) ? url : `https://${url}`).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function externalHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
}

/** Google Maps directions to an address. */
export function directionsHref(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

/** "tel:+18002209219" from "1-800-220-9219". */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits.length === 10 ? `+1${digits}` : digits.startsWith('1') && digits.length === 11 ? `+${digits}` : digits}`
}
