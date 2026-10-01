import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './icons'
import { btn } from './ui'

// Every photo of an item, cover first (staff set the order; up to four).
// One photo shows as it always has. Two or more become a strip to swipe, with
// Previous / Next buttons, "2 of 4" and a row of thumbnails, all on screen —
// nothing waits behind hover. A printout has the cover only.

function smooth(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  } catch {
    return 'auto'
  }
}

export default function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const strip = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  // While a button is moving the strip, the photos it passes don't count.
  const target = useRef<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const n = photos.length
  const shown = Math.min(at, Math.max(0, n - 1))

  /** Wherever the strip came to rest is the photo shown. */
  function settle() {
    const el = strip.current
    target.current = null
    if (el && el.clientWidth > 0) setAt(Math.round(el.scrollLeft / el.clientWidth))
  }

  // When a scroll ends — a swipe, a button, or a swipe that cut a button's scroll short.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    el.addEventListener('scrollend', settle)
    return () => el.removeEventListener('scrollend', settle)
  }, [n])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function onScroll() {
    const el = strip.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (target.current !== null) {
      if (i !== target.current) return
      target.current = null
    }
    setAt(i)
  }

  function go(i: number) {
    const el = strip.current
    const to = Math.max(0, Math.min(n - 1, i))
    setAt(to)
    if (!el) return
    target.current = to
    window.clearTimeout(timer.current)
    // Browsers without a scrollend event settle here instead.
    timer.current = window.setTimeout(settle, 1000)
    el.scrollTo({ left: to * el.clientWidth, behavior: smooth() })
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(shown + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(shown - 1)
    }
  }

  if (n === 0) return null
  if (n === 1) return <img src={photos[0]} alt={alt} className="aspect-[4/3] w-full rounded-2xl object-cover" />

  return (
    <div>
      {/* Paper gets the cover alone. */}
      <img src={photos[0]} alt={alt} className="print-only mx-auto max-h-[4.5in] w-auto max-w-full" />

      <div className="no-print">
        <div
          ref={strip}
          onScroll={onScroll}
          onKeyDown={onKey}
          tabIndex={0}
          role="region"
          aria-label={`Photos of ${alt}`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((src, i) => (
            <div key={`${i}-${src}`} className="w-full shrink-0 snap-center snap-always">
              <img
                src={src}
                alt={`${alt}, photo ${i + 1} of ${n}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                className="aspect-[4/3] w-full object-contain"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(shown - 1)}
            disabled={shown === 0}
            className={`${btn.outline} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Icon name="chevron" size={20} className="hidden rotate-180 min-[360px]:block" /> Previous
          </button>
          <p className="shrink-0 whitespace-nowrap text-base font-bold text-ink" aria-live="polite">
            {shown + 1} of {n}
          </p>
          <button
            type="button"
            onClick={() => go(shown + 1)}
            disabled={shown === n - 1}
            className={`${btn.outline} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Next <Icon name="chevron" size={20} className="hidden min-[360px]:block" />
          </button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-3" aria-label="Every photo">
          {photos.map((src, i) => (
            <li key={`${i}-${src}`}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Photo ${i + 1} of ${n}`}
                aria-current={i === shown ? 'true' : undefined}
                className={`block h-16 w-16 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20 ${
                  i === shown ? 'ring-4 ring-brand-blue ring-offset-2' : 'ring-1 ring-slate-300 hover:ring-2 hover:ring-brand-blue'
                }`}
              >
                <img src={src} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
