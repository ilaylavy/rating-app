import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, type Entry, type Photo } from '../db'
import { useActiveTripId } from '../store'
import { processPhoto } from '../utils/image'
import { isoToLocalInput, nowLocalInput, overallOf } from '../utils/format'
import { StarInput } from '../components/StarInput'
import { useBlobUrl } from '../hooks'

interface PhotoDraft {
  id: string
  full: Blob
  thumb: Blob
}

// Textarea that grows with its content so long notes stay fully visible.
function AutoTextarea({ value, ...rest }: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return <textarea ref={ref} rows={1} value={value} {...rest} />
}

function DraftThumb({ draft, onRemove }: { draft: { thumb: Blob }; onRemove: () => void }) {
  const url = useBlobUrl(draft.thumb)
  return (
    <div className="photo-thumb">
      {url && <img src={url} alt="" />}
      <button type="button" className="photo-remove" onClick={onRemove} aria-label="Remove photo">
        ×
      </button>
    </div>
  )
}

export default function AddEntry() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray())
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').toArray())
  const activeTripId = useActiveTripId()

  const [loaded, setLoaded] = useState(!editId)
  const [original, setOriginal] = useState<Entry>()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(nowLocalInput())
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [critNotes, setCritNotes] = useState<Record<string, string>>({})
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [drafts, setDrafts] = useState<PhotoDraft[]>([])
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      const entry = await db.entries.get(editId)
      if (!entry || cancelled) return
      const photos = await db.photos.where('entryId').equals(editId).toArray()
      if (cancelled) return
      setOriginal(entry)
      setCategoryId(entry.categoryId)
      setTitle(entry.title)
      setLocation(entry.location ?? '')
      setDate(isoToLocalInput(entry.date))
      setRatings(entry.ratings)
      setCritNotes(entry.criterionNotes ?? {})
      setNote(entry.note ?? '')
      setExistingPhotos(photos)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [editId])

  const category = useMemo(
    () => categories?.find((c) => c.id === categoryId),
    [categories, categoryId],
  )
  const overall = overallOf(ratings)

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setProcessing(true)
    try {
      for (const file of Array.from(files)) {
        const { full, thumb } = await processPhoto(file)
        setDrafts((d) => [...d, { id: uid(), full, thumb }])
      }
    } catch {
      setError('Could not read one of the photos.')
    } finally {
      setProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    if (!category) return
    if (!title.trim()) {
      setError('Give it a name first.')
      return
    }
    if (overall === 0) {
      setError('Rate at least one thing.')
      return
    }
    const tripId = original?.tripId ?? activeTripId ?? trips?.[trips.length - 1]?.id
    if (!tripId) {
      setError('Create a trip first.')
      return
    }
    const cleanedNotes = Object.fromEntries(
      Object.entries(critNotes)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v),
    )
    // eslint-disable-next-line react-hooks/purity -- runs in the save click handler, not during render
    const now = Date.now()
    const entry: Entry = {
      id: original?.id ?? uid(),
      tripId,
      categoryId: category.id,
      title: title.trim(),
      location: location.trim() || undefined,
      ratings,
      criterionNotes: Object.keys(cleanedNotes).length ? cleanedNotes : undefined,
      overall,
      note: note.trim() || undefined,
      date: new Date(date).toISOString(),
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    }
    await db.transaction('rw', db.entries, db.photos, async () => {
      await db.entries.put(entry)
      if (removedPhotoIds.length) await db.photos.bulkDelete(removedPhotoIds)
      if (drafts.length) {
        await db.photos.bulkAdd(
          drafts.map((d) => ({ id: d.id, entryId: entry.id, blob: d.full, thumb: d.thumb, createdAt: now })),
        )
      }
    })
    navigate(`/entry/${entry.id}`, { replace: true })
  }

  if (!categories || !loaded) return null

  // Step 1 — pick a category
  if (!categoryId) {
    return (
      <div className="page">
        <header className="page-header form-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
          <h2>What are you rating?</h2>
        </header>
        <div className="cat-grid">
          {categories.map((c) => (
            <button key={c.id} className="cat-tile" style={{ borderColor: `${c.color}55` }} onClick={() => setCategoryId(c.id)}>
              <span className="cat-tile-emoji" style={{ background: `${c.color}26` }}>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
          <Link to="/categories/new" className="cat-tile cat-tile-new">
            <span className="cat-tile-emoji">+</span>
            <span>New category</span>
          </Link>
        </div>
      </div>
    )
  }

  // Step 2 — the rating form
  return (
    <div className="page">
      <header className="page-header form-header">
        <button
          className="icon-btn"
          onClick={() => (editId ? navigate(-1) : setCategoryId(null))}
          aria-label="Back"
        >
          ←
        </button>
        <h2>{editId ? 'Edit entry' : `Rate a ${category?.name.replace(/s$/, '') ?? 'thing'}`}</h2>
      </header>

      <div className="card">
        <div className="form-cat-row">
          <span className="badge big" style={{ background: `${category!.color}26`, color: category!.color }}>
            {category!.emoji} {category!.name}
          </span>
          {!editId && (
            <button className="link-btn" onClick={() => setCategoryId(null)}>
              change
            </button>
          )}
        </div>

        <label className="field">
          <span>Name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${category!.name === 'Coffee' ? 'Bear Pond Espresso' : 'What was it called?'}`}
            autoFocus={!editId}
          />
        </label>

        <label className="field">
          <span>Location <em>(optional)</em></span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Shimokitazawa, Tokyo" />
        </label>

        <label className="field">
          <span>When</span>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <h3 className="card-title">Ratings</h3>
        {category!.criteria.map((cr) => {
          const noteOpen = openNotes.has(cr.id) || !!critNotes[cr.id]
          return (
            <div key={cr.id}>
              <div className="rating-row">
                <span>{cr.name}</span>
                <div className="rating-right">
                  <StarInput
                    value={ratings[cr.id] ?? 0}
                    onChange={(v) => setRatings((r) => ({ ...r, [cr.id]: v }))}
                  />
                  <button
                    type="button"
                    className={`note-toggle ${noteOpen ? 'on' : ''}`}
                    aria-label={`Note for ${cr.name}`}
                    onClick={() =>
                      setOpenNotes((s) => {
                        const next = new Set(s)
                        if (next.has(cr.id)) next.delete(cr.id)
                        else next.add(cr.id)
                        return next
                      })
                    }
                  >
                    📝
                  </button>
                </div>
              </div>
              {noteOpen && (
                <AutoTextarea
                  className="crit-note-input"
                  value={critNotes[cr.id] ?? ''}
                  onChange={(e) => setCritNotes((n) => ({ ...n, [cr.id]: e.target.value }))}
                  placeholder={`Note about ${cr.name.toLowerCase()}… (optional)`}
                />
              )}
            </div>
          )
        })}
        <div className="overall-row">
          <span>Overall</span>
          <strong>{overall > 0 ? `${overall.toFixed(1)} ★` : '—'}</strong>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Photos</h3>
        <div className="photo-row">
          {existingPhotos
            .filter((p) => !removedPhotoIds.includes(p.id))
            .map((p) => (
              <DraftThumb key={p.id} draft={p} onRemove={() => setRemovedPhotoIds((ids) => [...ids, p.id])} />
            ))}
          {drafts.map((d) => (
            <DraftThumb key={d.id} draft={d} onRemove={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))} />
          ))}
          <button type="button" className="photo-add" onClick={() => fileRef.current?.click()} disabled={processing}>
            {processing ? '…' : '📷'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onPickFiles(e.target.files)}
        />
      </div>

      <div className="card">
        <h3 className="card-title">Notes</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Anything worth remembering? The single-origin pour-over was incredible…"
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="btn primary block save-btn" onClick={save} disabled={processing}>
        {editId ? 'Save changes' : 'Save entry'}
      </button>
    </div>
  )
}
