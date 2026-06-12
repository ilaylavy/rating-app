import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, deleteTripCascade, uid, type Trip } from '../db'
import { getActiveTripId, setActiveTripId } from '../store'
import { EmojiGrid } from '../components/EmojiGrid'

export default function TripForm() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(!editId)
  const [original, setOriginal] = useState<Trip>()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✈️')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editId) return
    db.trips.get(editId).then((t) => {
      if (!t) return
      setOriginal(t)
      setName(t.name)
      setEmoji(t.emoji)
      setStartDate(t.startDate ?? '')
      setEndDate(t.endDate ?? '')
      setLoaded(true)
    })
  }, [editId])

  async function save() {
    if (!name.trim()) {
      setError('Give the trip a name.')
      return
    }
    const trip: Trip = {
      id: original?.id ?? uid(),
      name: name.trim(),
      emoji,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: original?.createdAt ?? Date.now(),
    }
    await db.trips.put(trip)
    if (!original) setActiveTripId(trip.id)
    navigate(-1)
  }

  async function remove() {
    if (!original) return
    const count = await db.entries.where('tripId').equals(original.id).count()
    const msg =
      count > 0
        ? `Delete “${original.name}” and its ${count} entr${count === 1 ? 'y' : 'ies'} (incl. photos)? This can't be undone.`
        : `Delete “${original.name}”?`
    if (!confirm(msg)) return
    await deleteTripCascade(original.id)
    if (getActiveTripId() === original.id) setActiveTripId(null)
    navigate('/settings', { replace: true })
  }

  if (!loaded) return null

  return (
    <div className="page">
      <header className="page-header form-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h2>{editId ? 'Edit trip' : 'New trip'}</h2>
      </header>

      <div className="card">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Japan 2026" autoFocus={!editId} />
        </label>
        <label className="field">
          <span>Emoji</span>
          <EmojiGrid value={emoji} onChange={setEmoji} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Starts <em>(optional)</em></span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Ends <em>(optional)</em></span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="btn primary block" onClick={save}>
        {editId ? 'Save changes' : 'Create trip'}
      </button>
      {editId && original && (
        <button className="btn danger-ghost block" onClick={remove}>
          Delete trip
        </button>
      )}
    </div>
  )
}
