import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, type Entry, type Trip } from '../db'
import { setActiveTripId, useActiveTripId } from '../store'
import { EntryCard } from '../components/EntryCard'
import { EmojiGrid } from '../components/EmojiGrid'

function Onboarding() {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✈️')

  async function start() {
    const trip: Trip = { id: uid(), name: name.trim() || 'My trip', emoji, createdAt: Date.now() }
    await db.trips.add(trip)
    setActiveTripId(trip.id)
  }

  return (
    <div className="page onboarding">
      <div className="onboarding-hero">
        <div className="onboarding-logo">★</div>
        <h1>TripRate</h1>
        <p className="muted">
          Rate the coffee, food, sights and everything else you do on your trips. Everything is
          saved on your device — it even works offline.
        </p>
      </div>
      <div className="card">
        <label className="field">
          <span>Where are you going?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Japan 2026"
            autoFocus
          />
        </label>
        <label className="field">
          <span>Pick an emoji</span>
          <EmojiGrid value={emoji} onChange={setEmoji} />
        </label>
        <button className="btn primary block" onClick={start}>
          Start my trip
        </button>
      </div>
    </div>
  )
}

function TripSwitcher({ trips, active, onClose }: { trips: Trip[]; active?: Trip; onClose: () => void }) {
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <h3>Your trips</h3>
        {trips.map((t) => (
          <button
            key={t.id}
            className={`sheet-row ${t.id === active?.id ? 'on' : ''}`}
            onClick={() => {
              setActiveTripId(t.id)
              onClose()
            }}
          >
            <span className="sheet-emoji">{t.emoji}</span>
            <span>{t.name}</span>
            {t.id === active?.id && <span className="check">✓</span>}
          </button>
        ))}
        <Link to="/trips/new" className="btn ghost block" onClick={onClose}>
          + New trip
        </Link>
      </div>
    </>
  )
}

export default function Journal() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray())
  const activeTripId = useActiveTripId()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)

  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return undefined
    return trips.find((t) => t.id === activeTripId) ?? trips[trips.length - 1]
  }, [trips, activeTripId])

  const entries = useLiveQuery(
    () => (activeTrip ? db.entries.where('tripId').equals(activeTrip.id).toArray() : Promise.resolve<Entry[]>([])),
    [activeTrip?.id],
  )

  const sorted = useMemo(
    () => (entries ?? []).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  )
  const visible = filter ? sorted.filter((e) => e.categoryId === filter) : sorted

  const usedCategories = useMemo(() => {
    const ids = new Set((entries ?? []).map((e) => e.categoryId))
    return (categories ?? []).filter((c) => ids.has(c.id))
  }, [entries, categories])

  if (!trips || !categories) return null
  if (trips.length === 0) return <Onboarding />

  return (
    <div className="page">
      <header className="page-header">
        <button className="trip-pill" onClick={() => setSwitcherOpen(true)}>
          <span>{activeTrip?.emoji}</span>
          <span className="trip-pill-name">{activeTrip?.name}</span>
          <span className="chev">▾</span>
        </button>
      </header>

      {usedCategories.length > 0 && (
        <div className="chips">
          <button className={`chip ${filter === null ? 'on' : ''}`} onClick={() => setFilter(null)}>
            All
          </button>
          {usedCategories.map((c) => (
            <button
              key={c.id}
              className={`chip ${filter === c.id ? 'on' : ''}`}
              onClick={() => setFilter(filter === c.id ? null : c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📓</div>
          <p>Nothing rated yet on this trip.</p>
          <p className="muted">Tap + to rate your first coffee, meal or sight.</p>
        </div>
      ) : (
        <div className="entry-list">
          {visible.map((e) => (
            <EntryCard key={e.id} entry={e} category={categories.find((c) => c.id === e.categoryId)} />
          ))}
        </div>
      )}

      <Link to="/add" className="fab" aria-label="Add entry">
        +
      </Link>

      {switcherOpen && <TripSwitcher trips={trips} active={activeTrip} onClose={() => setSwitcherOpen(false)} />}
    </div>
  )
}
