import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type Entry } from '../db'
import { useActiveTripId } from '../store'
import { Stars } from '../components/Stars'

function criterionAvg(items: Entry[], criterionId: string) {
  const vals = items.map((e) => e.ratings[criterionId] ?? 0).filter((v) => v > 0)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function StatCards({ entries, photoCount }: { entries: Entry[]; photoCount: number }) {
  const avg = entries.reduce((s, e) => s + e.overall, 0) / entries.length
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <strong>{entries.length}</strong>
        <span className="muted small">entries</span>
      </div>
      <div className="stat-card">
        <strong>{avg.toFixed(1)} ★</strong>
        <span className="muted small">avg rating</span>
      </div>
      <div className="stat-card">
        <strong>{photoCount}</strong>
        <span className="muted small">photos</span>
      </div>
    </div>
  )
}

function Overview({
  entries,
  groups,
  categories,
  onPick,
}: {
  entries: Entry[]
  groups: { category: Category; items: Entry[] }[]
  categories: Category[]
  onPick: (id: string) => void
}) {
  const top = entries.slice().sort((a, b) => b.overall - a.overall).slice(0, 3)
  return (
    <>
      <div className="card">
        <h3 className="card-title">🏆 Best of the trip</h3>
        {top.map((e, i) => {
          const c = categories.find((x) => x.id === e.categoryId)
          return (
            <Link to={`/entry/${e.id}`} className="top-row" key={e.id}>
              <span className="top-rank">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="list-main">
                <span>{e.title}</span>
                <span className="muted small">{c ? `${c.emoji} ${c.name}` : ''}</span>
              </span>
              <span className="rating-num">{e.overall.toFixed(1)} ★</span>
            </Link>
          )
        })}
      </div>

      <div className="card">
        <h3 className="card-title">By category</h3>
        {groups.map(({ category, items }) => {
          const catAvg = items.reduce((s, e) => s + e.overall, 0) / items.length
          return (
            <button className="top-row cat-jump" key={category.id} onClick={() => onPick(category.id)}>
              <span className="top-rank">{category.emoji}</span>
              <span className="list-main">
                <span>{category.name}</span>
                <span className="muted small">{items.length} {items.length === 1 ? 'entry' : 'entries'}</span>
              </span>
              <span className="rating-num">{catAvg.toFixed(1)} ★</span>
              <span className="chev muted">›</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function CategoryStats({
  category,
  items,
  photoCount,
}: {
  category: Category
  items: Entry[]
  photoCount: number
}) {
  const ranked = items.slice().sort((a, b) => b.overall - a.overall)
  return (
    <>
      <StatCards entries={items} photoCount={photoCount} />

      <div className="card">
        <h3 className="card-title">Average by criterion</h3>
        {category.criteria.map((cr) => {
          const v = criterionAvg(items, cr.id)
          if (v === null) return null
          return (
            <div className="bar-row" key={cr.id}>
              <span className="bar-label">{cr.name}</span>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(v / 5) * 100}%`, background: category.color }} />
              </div>
              <span className="bar-num">{v.toFixed(1)}</span>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="card-title">
          🏆 Best {category.name.toLowerCase()}
        </h3>
        {ranked.map((e, i) => (
          <Link to={`/entry/${e.id}`} className="top-row" key={e.id}>
            <span className="top-rank">{['🥇', '🥈', '🥉'][i] ?? <span className="rank-num">{i + 1}</span>}</span>
            <span className="list-main">
              <span>{e.title}</span>
              {e.location && <span className="muted small">📍 {e.location}</span>}
            </span>
            <span className="rating-num">
              <Stars value={e.overall} size={12} />
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

export default function Stats() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray())
  const activeTripId = useActiveTripId()
  const [selected, setSelected] = useState<string | null>(null)

  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return undefined
    return trips.find((t) => t.id === activeTripId) ?? trips[trips.length - 1]
  }, [trips, activeTripId])

  const entries = useLiveQuery(
    () => (activeTrip ? db.entries.where('tripId').equals(activeTrip.id).toArray() : Promise.resolve<Entry[]>([])),
    [activeTrip?.id],
  )
  // entryId of every photo on this trip, so each tab can count its own
  const photoEntryIds = useLiveQuery(async () => {
    if (!entries || entries.length === 0) return [] as string[]
    const photos = await db.photos
      .where('entryId')
      .anyOf(entries.map((e) => e.id))
      .toArray()
    return photos.map((p) => p.entryId)
  }, [entries])

  if (!trips || !categories || !entries) return null

  if (!activeTrip || entries.length === 0) {
    return (
      <div className="page">
        <header className="page-header"><h2>Stats</h2></header>
        <div className="empty">
          <div className="empty-icon">📊</div>
          <p>No data yet{activeTrip ? ` for ${activeTrip.name}` : ''}.</p>
          <p className="muted">Rate a few things and your trip stats will show up here.</p>
        </div>
      </div>
    )
  }

  const groups = categories
    .map((c) => ({ category: c, items: entries.filter((e) => e.categoryId === c.id) }))
    .filter((g) => g.items.length > 0)
  // falls back to the overview when the selected category has no entries (anymore)
  const selectedGroup = groups.find((g) => g.category.id === selected)

  const countPhotos = (items: Entry[]) => {
    const ids = new Set(items.map((e) => e.id))
    return (photoEntryIds ?? []).filter((id) => ids.has(id)).length
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>
          {activeTrip.emoji} {activeTrip.name}
        </h2>
      </header>

      <div className="chips">
        <button className={`chip ${!selectedGroup ? 'on' : ''}`} onClick={() => setSelected(null)}>
          Overview
        </button>
        {groups.map(({ category }) => (
          <button
            key={category.id}
            className={`chip ${selectedGroup?.category.id === category.id ? 'on' : ''}`}
            onClick={() => setSelected(category.id)}
          >
            {category.emoji} {category.name}
          </button>
        ))}
      </div>

      {selectedGroup ? (
        <CategoryStats
          category={selectedGroup.category}
          items={selectedGroup.items}
          photoCount={countPhotos(selectedGroup.items)}
        />
      ) : (
        <>
          <StatCards entries={entries} photoCount={countPhotos(entries)} />
          <Overview entries={entries} groups={groups} categories={categories} onPick={setSelected} />
        </>
      )}
    </div>
  )
}
