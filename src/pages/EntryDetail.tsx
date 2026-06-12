import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteEntry, type Photo } from '../db'
import { useBlobUrl } from '../hooks'
import { fmtDateTime } from '../utils/format'
import { Stars } from '../components/Stars'

function GalleryImg({ photo }: { photo: Photo }) {
  const url = useBlobUrl(photo.blob)
  return url ? <img src={url} alt="" /> : <div className="gallery-ph" />
}

export default function EntryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const entry = useLiveQuery(() => db.entries.get(id!).then((e) => e ?? null), [id])
  const category = useLiveQuery(
    () => (entry ? db.categories.get(entry.categoryId) : undefined),
    [entry?.categoryId],
  )
  const photos = useLiveQuery(() => db.photos.where('entryId').equals(id!).toArray(), [id])

  if (entry === undefined) return null
  if (entry === null) {
    return (
      <div className="page">
        <p className="muted">Entry not found.</p>
        <Link to="/" className="btn ghost">Back to journal</Link>
      </div>
    )
  }

  async function remove() {
    if (!confirm(`Delete “${entry!.title}”? This can't be undone.`)) return
    await deleteEntry(entry!.id)
    navigate('/', { replace: true })
  }

  const ratedCriteria = (category?.criteria ?? []).filter(
    (c) => (entry.ratings[c.id] ?? 0) > 0 || entry.criterionNotes?.[c.id],
  )

  return (
    <div className="page detail">
      <header className="page-header form-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <div className="spacer" />
        <Link to={`/edit/${entry.id}`} className="icon-btn" aria-label="Edit">✏️</Link>
        <button className="icon-btn danger" onClick={remove} aria-label="Delete">🗑️</button>
      </header>

      {photos && photos.length > 0 && (
        <div className="gallery">
          {photos.map((p) => (
            <GalleryImg key={p.id} photo={p} />
          ))}
        </div>
      )}

      <div className="detail-head">
        {category && (
          <span className="badge" style={{ background: `${category.color}26`, color: category.color }}>
            {category.emoji} {category.name}
          </span>
        )}
        <h1>{entry.title}</h1>
        <div className="detail-overall">
          <Stars value={entry.overall} size={22} />
          <strong>{entry.overall.toFixed(1)}</strong>
        </div>
        <p className="muted">
          {fmtDateTime(entry.date)}
          {entry.location ? ` · 📍 ${entry.location}` : ''}
        </p>
      </div>

      {ratedCriteria.length > 0 && (
        <div className="card">
          <h3 className="card-title">Ratings</h3>
          {ratedCriteria.map((c) => {
            const v = entry.ratings[c.id] ?? 0
            const note = entry.criterionNotes?.[c.id]
            return (
              <div key={c.id}>
                <div className="bar-row">
                  <span className="bar-label">{c.name}</span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${(v / 5) * 100}%`, background: category?.color }} />
                  </div>
                  <span className="bar-num">{v > 0 ? v : '—'}</span>
                </div>
                {note && <p className="crit-note">{note}</p>}
              </div>
            )
          })}
        </div>
      )}

      {entry.note && (
        <div className="card">
          <h3 className="card-title">Notes</h3>
          <p className="note-text">{entry.note}</p>
        </div>
      )}
    </div>
  )
}
