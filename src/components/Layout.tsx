import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { Container, btn, linkText } from './ui'
import { useFestival, useOrg } from '../lib/data'
import { OFFICIAL_SITE, OHRR_APP, OHRR_SITE, OHRR_EMAIL_FALLBACK, STAFF_EDIT, ext } from '../lib/links'
import { VERSION_LABEL } from '../lib/version'

/** The pages in the menu — the questions people come with, in plain words. */
const NAV = [
  { to: '/visit', label: 'Plan your visit' },
  { to: '/your-rabbit', label: 'Bringing your rabbit' },
  { to: '/schedule', label: 'Talks & schedule' },
  { to: '/festival', label: 'At the festival' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/rescues', label: 'Rescues' },
  { to: '/map', label: 'Map' },
]

/** Every page, for the footer — nothing is more than one click from anywhere. */
const ALL_PAGES = [
  ...NAV,
  { to: '/speakers', label: 'Speakers' },
  { to: '/sponsors', label: 'Sponsors' },
  { to: '/auction', label: 'Silent auction' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/past', label: 'Past years' },
]

function useScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // Wait a moment for the page's content to arrive, then go to the anchor.
      const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 300)
      return () => window.clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
}

function TicketsButton({ className = '', short = false }: { className?: string; short?: boolean }) {
  const { festival, over } = useFestival()
  const url = festival?.info.ticketsUrl
  if (!url || over) return null
  return (
    <a href={url} {...ext} className={`${btn.primary} ${short ? 'px-4' : ''} ${className}`}>
      <Icon name="ticket" size={22} /> {short ? 'Tickets' : 'Buy tickets'}
    </a>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-12 items-center rounded-lg px-3 text-base font-bold transition ${
      isActive ? 'bg-fest-50 text-fest-dark ring-1 ring-fest/30' : 'text-ink hover:bg-slate-100'
    }`

  return (
    <header className="border-b border-slate-200 bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to the page
      </a>
      <Container className="flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Midwest BunFest — home">
          <img src="/img/bunfest-2026-logo.png" alt="" className="h-12 w-auto shrink-0 sm:h-16" />
          <span className="min-w-0 leading-tight">
            {/* On a small phone the artwork carries the name, leaving room for Tickets and Menu. */}
            <span className="hidden font-display text-xl font-black text-ink sm:block sm:text-2xl">Midwest BunFest</span>
            <span className="hidden text-sm font-semibold text-slate-700 sm:block">Hosted by Ohio House Rabbit Rescue</span>
          </span>
        </Link>
        <div className="hidden shrink-0 md:block">
          <TicketsButton />
        </div>
        <div className="ml-auto shrink-0 md:hidden">
          <TicketsButton short />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg border-2 border-slate-300 px-4 text-base font-bold text-ink md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {open ? 'Close' : 'Menu'}
        </button>
      </Container>

      {/* Desktop: every page in the menu is always visible — nothing opens on hover. */}
      <nav aria-label="Main" className="hidden border-t border-slate-100 md:block">
        <Container className="flex flex-wrap gap-1 py-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navLink}>
              {n.label}
            </NavLink>
          ))}
        </Container>
      </nav>

      {/* Phone: the same list, opened with the labelled Menu button. */}
      {open && (
        <nav id="site-menu" aria-label="Main" className="border-t border-slate-100 md:hidden">
          <Container className="grid gap-1 py-3">
            {ALL_PAGES.map((n) => (
              <NavLink key={n.to} to={n.to} className={navLink}>
                {n.label}
              </NavLink>
            ))}
            <TicketsButton className="mt-2" />
          </Container>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  const { festival } = useFestival()
  const org = useOrg()
  const email = org.data?.email ?? OHRR_EMAIL_FALLBACK
  return (
    <footer className="mt-16 border-t border-slate-200 bg-canvas">
      <Container className="grid gap-10 py-10 md:grid-cols-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Every page</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-1">
            {ALL_PAGES.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className={`${linkText} inline-block py-1`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Ohio House Rabbit Rescue</h2>
          <p className="mt-3 text-base text-slate-700">
            Midwest BunFest is hosted by Ohio House Rabbit Rescue, a nonprofit run by volunteers
            {org.data?.ein ? ` (501(c)(3), EIN ${org.data.ein})` : ''}.
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={`${OHRR_SITE}/adopt`} {...ext} className={`${linkText} inline-block py-1`}>
                Adopt a rabbit
              </a>
            </li>
            <li>
              <a href={`${OHRR_SITE}/volunteer`} {...ext} className={`${linkText} inline-block py-1`}>
                Volunteer with OHRR
              </a>
            </li>
            <li>
              <a href={`${OHRR_SITE}/give`} {...ext} className={`${linkText} inline-block py-1`}>
                Give to OHRR
              </a>
            </li>
            <li>
              <a href={OHRR_APP} {...ext} className={`${linkText} inline-block py-1`}>
                The OHRR app
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Questions?</h2>
          <p className="mt-3 text-base text-slate-700">
            Email{' '}
            <a href={`mailto:${email}`} className={`${linkText} break-all`}>
              {email}
            </a>
            . OHRR is run by volunteers, so someone will reply as soon as they can.
          </p>
          {festival?.info.logoCredit && <p className="mt-4 text-xs text-slate-600">{festival.info.logoCredit}.</p>}
        </div>
      </Container>
      <div className="border-t border-slate-200">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-slate-600">
          <p>
            A sample site for the OHRR board. The official festival site is{' '}
            <a href={OFFICIAL_SITE} {...ext} className={linkText}>
              midwestbunfest.org
            </a>
            .
          </p>
          <p>
            <a href={STAFF_EDIT} {...ext} className={linkText}>
              OHRR staff: update these pages
            </a>
            <span className="ml-3">{VERSION_LABEL}</span>
          </p>
        </Container>
      </div>
    </footer>
  )
}

export default function Layout() {
  useScrollToTop()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
