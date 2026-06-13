import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { setActiveTripId, useActiveTripId } from '../store'
import { downloadBlob, exportBackup, importBackup } from '../utils/backup'

export default function Settings() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').toArray())
  const entryCounts = useLiveQuery(async () => {
    const entries = await db.entries.toArray()
    const map: Record<string, number> = {}
    for (const e of entries) map[e.tripId] = (map[e.tripId] ?? 0) + 1
    return map
  })
  const activeTripId = useActiveTripId()
  const importRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [persisted, setPersisted] = useState<boolean>()

  useEffect(() => {
    navigator.storage
      ?.persist?.()
      .then(setPersisted)
      .catch(() => {})
  }, [])

  const resolvedActiveId =
    trips?.find((t) => t.id === activeTripId)?.id ?? trips?.[trips.length - 1]?.id

  async function onExport() {
    setBusy(true)
    try {
      const blob = await exportBackup()
      downloadBlob(blob, `triprate-backup-${new Date().toISOString().slice(0, 10)}.json`)
      setMessage('Backup downloaded.')
    } finally {
      setBusy(false)
    }
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    if (!confirm('Importing a backup REPLACES everything currently in the app. Continue?')) return
    setBusy(true)
    try {
      const res = await importBackup(file)
      setActiveTripId(null)
      setMessage(`Imported ${res.trips} trip(s) and ${res.entries} entries.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  async function wipe() {
    if (!confirm('Erase ALL trips, entries, categories and photos from this device?')) return
    if (!confirm('Really sure? There is no undo. Consider exporting a backup first.')) return
    await db.transaction('rw', db.trips, db.categories, db.entries, db.photos, async () => {
      await Promise.all([db.trips.clear(), db.categories.clear(), db.entries.clear(), db.photos.clear()])
    })
    localStorage.removeItem('triprate-seeded')
    setActiveTripId(null)
    location.reload()
  }

  if (!trips) return null

  return (
    <div className="page">
      <header className="page-header">
        <h2>Settings</h2>
      </header>

      <h3 className="section-title">Trips</h3>
      <div className="list">
        {trips.map((t) => (
          <div key={t.id} className={`list-row ${t.id === resolvedActiveId ? 'active-row' : ''}`}>
            <button className="list-tap" onClick={() => setActiveTripId(t.id)}>
              <span className="list-emoji">{t.emoji}</span>
              <span className="list-main">
                <span>
                  {t.name}
                  {t.id === resolvedActiveId && <span className="active-tag"> · active</span>}
                </span>
                <span className="muted small">
                  {entryCounts?.[t.id] ?? 0} entries
                  {t.startDate ? ` · ${t.startDate}${t.endDate ? ` → ${t.endDate}` : ''}` : ''}
                </span>
              </span>
            </button>
            <Link to={`/trips/${t.id}`} className="icon-btn" aria-label={`Edit ${t.name}`}>
              ✏️
            </Link>
          </div>
        ))}
      </div>
      <Link to="/trips/new" className="btn ghost block">
        + New trip
      </Link>

      <h3 className="section-title">Your data</h3>
      <div className="card">
        <p className="muted small">
          Everything lives only on this device — app updates never touch it. Export a backup file
          from time to time — you can import it here on any phone or computer.
        </p>
        {persisted !== undefined && (
          <p className="muted small storage-status">
            {persisted
              ? '🔒 Storage is protected — the browser won’t auto-delete your data.'
              : '⚠️ The browser hasn’t granted protected storage yet. Adding the app to your home screen and exporting backups keeps your data safe.'}
          </p>
        )}
        <button className="btn block" onClick={onExport} disabled={busy}>
          ⬇️ Export backup
        </button>
        <button className="btn block" onClick={() => importRef.current?.click()} disabled={busy}>
          ⬆️ Import backup
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onImport(e.target.files?.[0])}
        />
        {message && <p className="muted small">{message}</p>}
      </div>

      <h3 className="section-title">Danger zone</h3>
      <button className="btn danger-ghost block" onClick={wipe}>
        Erase all data
      </button>

      <p className="muted small footer-note">
        TripRate · offline-first · your data never leaves your device
      </p>
    </div>
  )
}
