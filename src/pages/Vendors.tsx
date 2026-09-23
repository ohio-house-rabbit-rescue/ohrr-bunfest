import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Initial, LoadError, Loading, Note, PageTitle, WebLink, linkText } from '../components/ui'
import { PastYearNote, YearPicker } from '../components/YearPicker'
import { useFloor, useShownYear, useVendors } from '../lib/data'
import { formatNumbers } from '../lib/floor'

// This year's vendors — the specialty rabbit shops — with what they sell and
// where to find them. The list is kept year by year, so a vendor deciding
// whether to take a table can see who came before.
export default function Vendors() {
  const { year, current, isPast } = useShownYear()
  const vendors = useVendors(year)
  const floor = useFloor(isPast ? undefined : year)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const categories = useMemo(
    () => [...new Set((vendors.data ?? []).map((v) => v.category))].sort(),
    [vendors.data],
  )
  const q = search.trim().toLowerCase()
  const shown = (vendors.data ?? []).filter(
    (v) =>
      (!category || v.category === category) &&
      (!q || v.name.toLowerCase().includes(q) || (v.blurb ?? '').toLowerCase().includes(q)),
  )

  return (
    <>
      <PageTitle
        title={isPast ? `Vendors, ${year}` : 'Vendors'}
        icon="bag"
        intro="Specialty rabbit goods you won't find in most pet stores — art, toys, beds, treats and gifts."
      >
        <YearPicker current={current} />
      </PageTitle>
      <Container className="mt-8">
        {isPast && <PastYearNote year={year!} />}
        {vendors.error ? (
          <LoadError retry={vendors.retry} what="the vendors" />
        ) : vendors.loading ? (
          <Loading what="the vendors" />
        ) : (vendors.data ?? []).length === 0 ? (
          <Note>The {year} vendors are announced closer to the festival.</Note>
        ) : (
          <>
            <div className="no-print space-y-4">
              <label className="block max-w-md">
                <span className="text-base font-bold text-ink">Find a vendor</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or what they sell"
                  className="mt-1 block min-h-12 w-full rounded-xl border-2 border-slate-300 px-4 text-base focus:border-brand-blue focus:outline-none"
                />
              </label>
              {categories.length > 1 && (
                <div role="group" aria-label="Show one kind of vendor" className="flex flex-wrap gap-2">
                  {['', ...categories].map((c) => (
                    <button
                      key={c || 'all'}
                      type="button"
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                      className={`min-h-12 rounded-full border-2 px-4 text-base font-bold transition ${
                        category === c ? 'border-fest-dark bg-fest-dark text-white' : 'border-slate-300 bg-white text-ink hover:border-fest'
                      }`}
                    >
                      {c || `All (${vendors.data!.length})`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {shown.length === 0 ? (
              <p className="mt-6 text-lg">
                No vendor matches that.{' '}
                <button type="button" onClick={() => { setSearch(''); setCategory('') }} className={linkText}>
                  Show them all
                </button>
              </p>
            ) : (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {shown.map((v) => {
                  const tables = floor.data?.placeOf('vendor', v.id).numbers ?? []
                  return (
                    <li key={v.id} className="print-break-inside-avoid flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <Initial name={v.name} className="h-14 w-14 text-2xl" />
                      <div className="min-w-0">
                        <h2 className="font-display text-xl font-extrabold text-ink">{v.name}</h2>
                        <p className="text-sm font-bold uppercase tracking-wide text-fest-dark">{v.category}</p>
                        {v.blurb && <p className="mt-2 text-base text-slate-800">{v.blurb}</p>}
                        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-base">
                          {v.website && <WebLink url={v.website} label="Their shop" />}
                          {tables.length > 0 && (
                            <Link to={`/map?table=${tables[0]}`} className={linkText}>
                              {tables.length > 1 ? 'Tables' : 'Table'} {formatNumbers(tables)} on the map
                            </Link>
                          )}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </Container>
    </>
  )
}
