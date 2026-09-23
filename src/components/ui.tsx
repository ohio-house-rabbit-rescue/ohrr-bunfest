import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './icons'
import { destOf, ext, externalHref, hostOf } from '../lib/links'

// The site's building blocks. Built to the web rules in the design brief:
// 18px body text, dark text on white, 48px targets with space between them,
// nothing behind hover, labels in plain words.

export const btn = {
  primary:
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-base font-bold text-ink shadow-sm transition hover:bg-brand-orange-dark',
  blue: 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-blue-dark',
  outline:
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-brand-blue px-6 py-2.5 text-base font-bold text-brand-blue transition hover:bg-brand-blue-50',
}

export const linkText = 'font-semibold text-brand-blue underline decoration-brand-blue/40 underline-offset-4 hover:decoration-brand-blue'

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>
}

/** Where you are, and the way back — every page but the home page has one. */
export function PageTitle({
  title,
  intro,
  crumbs = [],
  icon,
  children,
}: {
  title: string
  intro?: ReactNode
  crumbs?: { to: string; label: string }[]
  icon?: IconName
  children?: ReactNode
}) {
  // The page's name in the browser tab too — "always say where you are".
  useEffect(() => {
    document.title = `${title} · Midwest BunFest`
  }, [title])
  return (
    <div className="border-b border-slate-200 bg-fest-50">
      <Container className="py-6 sm:py-8">
        <nav aria-label="You are here" className="no-print text-sm text-slate-700">
          <Link to="/" className={linkText}>
            Midwest BunFest
          </Link>
          {crumbs.map((c) => (
            <span key={c.to}>
              <span className="mx-2 text-slate-500" aria-hidden="true">
                ›
              </span>
              <Link to={c.to} className={linkText}>
                {c.label}
              </Link>
            </span>
          ))}
          <span className="mx-2 text-slate-500" aria-hidden="true">
            ›
          </span>
          <span aria-current="page">{title}</span>
        </nav>
        <div className="mt-3 flex items-start gap-4">
          {icon && (
            <span className="no-print mt-1 hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-fest-dark ring-1 ring-fest/20 sm:flex">
              <Icon name={icon} size={30} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-black leading-tight text-ink sm:text-4xl">{title}</h1>
            {intro && <div className="mt-2 max-w-3xl text-lg text-slate-700">{intro}</div>}
          </div>
        </div>
        {children}
      </Container>
    </div>
  )
}

export function H2({ children, id, className = '' }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={`scroll-mt-24 font-display text-2xl font-black text-ink ${className}`}>
      {children}
    </h2>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>
}

export function Chip({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'grey' }) {
  const t =
    tone === 'orange'
      ? 'bg-brand-orange-50 text-brand-orange-ink ring-brand-orange/30'
      : tone === 'grey'
        ? 'bg-slate-100 text-slate-700 ring-slate-300'
        : 'bg-brand-blue-50 text-brand-blue-dark ring-brand-blue/20'
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${t}`}>{children}</span>
}

/** The rule that matters — the rabbit vaccination rule, mostly. */
export function Rule({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-base text-amber-950 sm:p-5 ${className}`}>
      <Icon name="info" size={24} className="mt-0.5 shrink-0 text-amber-700" />
      <div>{children}</div>
    </div>
  )
}

/** A quiet, honest note: "not out yet", "earlier years are elsewhere". */
export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700 ${className}`}>
      <Icon name="clock" size={22} className="mt-0.5 shrink-0 text-slate-500" />
      <div>{children}</div>
    </div>
  )
}

export function Loading({ what = 'this page' }: { what?: string }) {
  return (
    <p className="py-10 text-center text-lg text-slate-600" role="status">
      Loading {what}…
    </p>
  )
}

/** A read failed — say so, and offer the next step. Never a blank page. */
export function LoadError({ retry, what = 'this' }: { retry: () => void; what?: string }) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="font-display text-xl font-extrabold text-ink">We couldn't load {what} just now.</p>
      <p className="mt-1 text-base text-slate-700">Check your connection, then try again.</p>
      <button type="button" onClick={retry} className={`${btn.blue} mt-4`}>
        Try again
      </button>
    </div>
  )
}

export function PrintButton({ label = 'Print this page' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btn.outline} no-print`}>
      <Icon name="printer" size={20} /> {label}
    </button>
  )
}

/**
 * A link OHRR typed into the database: an app path becomes this site's page
 * (or the OHRR website's), a web address opens in a new tab.
 */
export function SmartLink({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: ReactNode
}) {
  const d = destOf(to)
  if ('to' in d) {
    return (
      <Link to={d.to} className={className}>
        {children}
      </Link>
    )
  }
  const external = !d.href.startsWith('mailto:') && !d.href.startsWith('tel:')
  return (
    <a href={d.href} {...(external ? ext : {})} className={className}>
      {children}
    </a>
  )
}

/** A web address shown as its readable name, e.g. "oxbowanimalhealth.com". */
export function WebLink({ url, label }: { url: string; label?: string }) {
  return (
    <a href={externalHref(url)} {...ext} className={`${linkText} break-words`}>
      {label ?? hostOf(url)}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * A big tappable row — used for lists of next steps. `to` is a page on this
 * site; with `fromDatabase` it is a link OHRR typed (an app path), translated
 * by SmartLink.
 */
export function RowLink({
  to,
  children,
  icon = 'chevron',
  fromDatabase = false,
}: {
  to: string
  children: ReactNode
  icon?: IconName
  fromDatabase?: boolean
}) {
  const cls =
    'flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-ink shadow-sm transition hover:border-brand-blue hover:bg-brand-blue-50'
  const inner = (
    <>
      <span>{children}</span>
      <Icon name={icon} size={22} className="shrink-0 text-brand-blue" />
    </>
  )
  return fromDatabase ? (
    <SmartLink to={to} className={cls}>
      {inner}
    </SmartLink>
  ) : (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  )
}

/** A photo, or the initial on a plain tile when there isn't one yet. */
export function Initial({ name, className = 'h-16 w-16 text-2xl' }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-fest-50 font-display font-black text-fest-dark ${className}`}
    >
      {name.replace(/^the\s+/i, '').trim().slice(0, 1).toUpperCase()}
    </div>
  )
}

/** Longer text OHRR wrote: blank-line paragraphs, "## " headings, "- " bullets. */
export function Prose({ body }: { body: string }) {
  const blocks = body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((l) => l.length > 0)
  return (
    <div className="space-y-4 text-base text-slate-800">
      {blocks.map((lines, i) => {
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          )
        }
        if (lines[0].startsWith('## ')) {
          return (
            <div key={i}>
              <h3 className="font-display text-xl font-extrabold text-ink">{lines[0].slice(3)}</h3>
              {lines.length > 1 && <p className="mt-2">{lines.slice(1).join(' ')}</p>}
            </div>
          )
        }
        return <p key={i}>{lines.join(' ')}</p>
      })}
    </div>
  )
}
