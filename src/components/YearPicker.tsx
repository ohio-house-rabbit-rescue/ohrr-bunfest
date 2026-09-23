import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useArchiveYears } from '../lib/data'
import { Note, linkText } from './ui'

/**
 * "Other years: 2025 · 2024" under a page title — every year's programme,
 * vendors and rescues are kept, not overwritten. Shows nothing until there is
 * more than one year to choose from.
 */
export function YearPicker({ current }: { current: number | undefined }) {
  const years = useArchiveYears()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const list = years.data ?? []
  if (!current || list.filter((y) => y !== current).length === 0) return null
  const shown = Number(params.get('year')) || current
  return (
    <p className="no-print mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
      <span className="font-semibold text-slate-700">Year:</span>
      {[current, ...list.filter((y) => y !== current)].map((y) =>
        y === shown ? (
          <span key={y} aria-current="true" className="rounded-full bg-fest-dark px-3 py-1 font-bold text-white">
            {y}
          </span>
        ) : (
          <Link key={y} to={y === current ? pathname : `${pathname}?year=${y}`} className={`${linkText} px-1 py-1`}>
            {y}
          </Link>
        ),
      )}
    </p>
  )
}

export function PastYearNote({ year }: { year: number }) {
  const { pathname } = useLocation()
  return (
    <Note className="mb-6">
      You're looking at {year}, kept for the record.{' '}
      <Link to={pathname} className={linkText}>
        See this year's
      </Link>
    </Note>
  )
}
