import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/icons'
import { VenuePlan, ZoomBox, holderLabel, type TableColors } from '../components/VenuePlan'
import { Card, Container, LoadError, Loading, Note, PageTitle, PrintButton, WebLink, btn } from '../components/ui'
import { useFestival, useFloor, useVendors } from '../lib/data'
import { formatNumbers, roomRanges, type Block, type TableAssignment } from '../lib/floor'

// The rooms to scale, with every vendor and rescue by table — the same
// drawing staff see when they place people (Staff → BunFest → Floor plan).

// The same colours as the app's map, so a printed map and a phone agree.
const CATEGORY_COLOR: Record<string, string> = {
  Art: '#e0950f',
  'Jewelry & Gifts': '#0669ac',
  'Toys & Enrichment': '#2f9e7f',
  'Beds & Comfort': '#9b6cc4',
  'Treats & Food': '#d9663d',
  'Home & Apparel': '#3aa0c4',
}
const EXTRA_COLORS = ['#0669ac', '#e0950f', '#2f9e7f', '#9b6cc4', '#d9663d', '#4b7bb5', '#b5710c']
function colorFor(category: string | null): string {
  if (!category) return '#0669ac'
  if (CATEGORY_COLOR[category]) return CATEGORY_COLOR[category]
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) % 997
  return EXTRA_COLORS[h % EXTRA_COLORS.length]
}
const COLORS: TableColors = { vendor: colorFor, rescue: '#b8620c', other: '#475569' }

const kindLabel = (h: TableAssignment | null) =>
  !h ? 'Nobody has this table yet' : h.kind === 'rescue' ? 'Rescue partner' : h.kind === 'other' ? 'At BunFest' : (h.category ?? 'Vendor')

export default function EventMap() {
  const [params, setParams] = useSearchParams()
  const f = useFestival()
  const year = f.festival?.year
  const floor = useFloor(year)
  const vendors = useVendors(year)
  const fl = floor.data
  const venue = fl?.venue ?? null

  const selected = useMemo(() => {
    const t = Number(params.get('table'))
    return Number.isFinite(t) && t > 0 ? t : undefined
  }, [params])
  const select = (b: Block) => setParams({ table: String(b.numbers[0]) }, { replace: true })

  const selBlock = selected && fl ? fl.blocks.find((b) => b.numbers.includes(selected)) : undefined
  const selRoom = selBlock && venue ? venue.rooms.find((r) => r.id === selBlock.roomId) : undefined
  const ranges = useMemo(() => (venue ? roomRanges(venue) : new Map<string, [number, number] | null>()), [venue])
  const categories = useMemo(() => [...new Set((vendors.data ?? []).map((v) => v.category))].sort(), [vendors.data])
  const selVendor = selBlock?.holder?.kind === 'vendor' ? vendors.data?.find((v) => v.id === selBlock.holder?.id) : undefined

  // Every stand once, in table order.
  const stands = useMemo(() => {
    if (!fl) return []
    const seen = new Set<string>()
    return fl.blocks
      .filter((b): b is Block & { holder: TableAssignment } => !!b.holder)
      .filter((b) => {
        const k = `${b.holder.kind}:${b.holder.id ?? b.holder.name}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map((b) => {
        const all = b.holder.id ? fl.placeOf(b.holder.kind, b.holder.id).numbers : b.numbers
        return { block: b, holder: b.holder, numbers: all.length > 0 ? all : b.numbers }
      })
  }, [fl])

  return (
    <>
      <PageTitle
        title="Map"
        icon="mappin"
        intro={
          venue?.name
            ? `${venue.name}: the rooms, the activities, and every vendor and rescue by table number.`
            : 'The rooms, the activities, and every vendor and rescue by table number.'
        }
      />
      <Container className="mt-8 space-y-6">
        {floor.error ? (
          <LoadError retry={floor.retry} what="the map" />
        ) : !fl ? (
          <Loading what="the map" />
        ) : !venue ? (
          <Note>The {fl.year} floor plan is published closer to the festival.</Note>
        ) : (
          <>
            <div className="no-print flex flex-wrap gap-3">
              <PrintButton label="Print the map" />
            </div>
            {fl.assignments.length === 0 && (
              <Note>The rooms are drawn; table numbers for each vendor and rescue go up here as OHRR places them.</Note>
            )}

            {selBlock && (
              <Card className="no-print border-2 border-brand-blue bg-brand-blue-50/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-black text-ink">{holderLabel(selBlock.holder)}</h2>
                    <p className="text-base text-slate-800">{kindLabel(selBlock.holder)}</p>
                    {selRoom && (
                      <p className="mt-1 flex items-center gap-1 text-base font-semibold text-slate-700">
                        <Icon name="mappin" size={18} className="text-brand-blue" /> {selRoom.name}
                      </p>
                    )}
                  </div>
                  <span className="rounded-xl bg-white px-3 py-1.5 font-display text-lg font-black text-ink ring-1 ring-slate-300">
                    {selBlock.numbers.length > 1 ? 'Tables' : 'Table'} {formatNumbers(selBlock.numbers)}
                  </span>
                </div>
                {selVendor?.website && (
                  <p className="mt-3 text-base">
                    <WebLink url={selVendor.website} label="Their shop" />
                  </p>
                )}
              </Card>
            )}

            {venue.rooms.map((room) => {
              const range = ranges.get(room.id)
              return (
                <section key={room.id} className="print-break-inside-avoid space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-2xl font-black text-ink">{room.name}</h2>
                    {range && (
                      <span className="text-base font-semibold text-slate-700">
                        Tables {range[0]}–{range[1]}
                      </span>
                    )}
                  </div>
                  {room.note && <p className="text-base text-slate-800">{room.note}</p>}
                  <ZoomBox>
                    <VenuePlan
                      room={room}
                      blocks={fl.blocks}
                      selectedTable={selected}
                      onSelectBlock={select}
                      colors={COLORS}
                      label={`${room.name} floor plan`}
                    />
                  </ZoomBox>
                </section>
              )
            })}

            <Card>
              <h2 className="font-display text-xl font-extrabold text-ink">Key</h2>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {categories.map((c) => (
                  <li key={c} className="inline-flex items-center gap-2 text-base text-slate-800">
                    <span className="h-4 w-4 rounded border-2" style={{ background: `${colorFor(c)}33`, borderColor: colorFor(c) }} />
                    {c}
                  </li>
                ))}
                <li className="inline-flex items-center gap-2 text-base text-slate-800">
                  <span className="h-4 w-4 rounded border-2" style={{ background: '#b8620c33', borderColor: '#b8620c' }} />
                  Rescue partner
                </li>
                <li className="inline-flex items-center gap-2 text-base text-slate-800">
                  <span className="h-4 w-4 rounded border-2 border-dashed border-slate-400 bg-white" />
                  Free table
                </li>
              </ul>
              <p className="mt-3 text-base text-slate-700">
                Tap or click a table to see who's there. The heavier edge of a table is the side you shop from. Use the + and −
                buttons to zoom.
              </p>
            </Card>

            {stands.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-black text-ink">Everyone, by table</h2>
                <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                  {stands.map((s) => (
                    <li key={formatNumbers(s.numbers)}>
                      <button
                        type="button"
                        onClick={() => {
                          select(s.block)
                          window.scrollTo({ top: 0 })
                        }}
                        className="flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <span className="inline-flex min-w-16 justify-center rounded-lg bg-slate-100 px-2 py-1 font-display text-base font-black text-ink">
                          {formatNumbers(s.numbers)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-bold text-ink">{holderLabel(s.holder)}</span>
                          <span className="block text-sm text-slate-700">{kindLabel(s.holder)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="no-print flex flex-wrap gap-3">
              <Link to="/vendors" className={btn.outline}>
                All vendors
              </Link>
              <Link to="/rescues" className={btn.outline}>
                All rescues
              </Link>
            </div>
          </>
        )}
      </Container>
    </>
  )
}
