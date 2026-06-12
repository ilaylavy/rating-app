import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Entry } from '../db'
import { useActiveTripId } from '../store'
import { Stars } from '../components/Stars'

export default function Stats() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray())
  const activeTripId = useActiveTripId()

  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return undefined
    return trips.find((t) => t.id === activeTripId) ?? trips[trips.length - 1]
  }, [trips, activeTripId])

  const entries = useLiveQuery(
    () => (activeTrip ? db.entries.where('tripId').equals(activeTrip.id).toArray() : Promise.resolve<Entry[]>([])),
    [activeTrip?.id],
  )
  const photoCount = useLiveQuery(async () => {
    if (!entries || entries.length === 0) return 0
    return db.photos
      .where('entryId')
      .anyOf(entries.map((e) => e.id))
      .count()
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

  const avg = entries.reduce((s, e) => s + e.overall, 0) / entries.length
  const top = entries.slice().sort((a, b) => b.overall - a.overall).slice(0, 3)
  const byCategory = categories
    .map((c) => ({ category: c, items: entries.filter((e) => e.categoryId === c.id) }))
    .filter((g) => g.items.length > 0)

  function criterionAvgs(items: Entry[], criterionId: string) {
    const vals = items.map((e) => e.ratings[criterionId] ?? 0).filter((v) => v > 0)
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>
          {activeTrip.emoji} {activeTrip.name}
        </h2>
      </header>

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
          <strong>{photoCount ?? 0}</strong>
          <span className="muted small">photos</span>
        </div>
      </div>

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

      {byCategory.map(({ category, items }) => {
        const catAvg = items.reduce((s, e) => s + e.overall, 0) / items.length
        const best = items.slice().sort((a, b) => b.overall - a.overall)[0]
        return (
          <div className="card" key={category.id}>
            <div className="cat-stat-head">
              <h3 className="card-title">
                {category.emoji} {category.name}
              </h3>
              <span className="muted small">
                {items.length} · avg {catAvg.toFixed(1)} ★
              </span>
            </div>
            {category.criteria.map((cr) => {
              const v = criterionAvgs(items, cr.id)
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
            <Link to={`/entry/${best.id}`} className="best-row">
              <span className="muted small">Best:</span> {best.title}
              <span className="rating-num"><Stars value={best.overall} size={12} /></span>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
