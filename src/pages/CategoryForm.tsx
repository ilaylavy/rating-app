import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, deleteCategoryCascade, uid, type Category, type Criterion } from '../db'
import { EmojiGrid } from '../components/EmojiGrid'

const PALETTE = [
  '#e0716f', '#f08a3c', '#f5b942', '#b08968', '#7fb069',
  '#4fb8a8', '#5b9bd5', '#8a7fd6', '#c97fd6', '#d66f9e',
]

export default function CategoryForm() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(!editId)
  const [original, setOriginal] = useState<Category>()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [color, setColor] = useState(PALETTE[6])
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: uid(), name: '' },
    { id: uid(), name: '' },
  ])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editId) return
    db.categories.get(editId).then((c) => {
      if (!c) return
      setOriginal(c)
      setName(c.name)
      setEmoji(c.emoji)
      setColor(c.color)
      setCriteria(c.criteria)
      setLoaded(true)
    })
  }, [editId])

  function setCriterionName(id: string, value: string) {
    setCriteria((cs) => cs.map((c) => (c.id === id ? { ...c, name: value } : c)))
  }

  async function save() {
    const cleaned = criteria.map((c) => ({ ...c, name: c.name.trim() })).filter((c) => c.name)
    if (!name.trim()) {
      setError('Give the category a name.')
      return
    }
    if (cleaned.length === 0) {
      setError('Add at least one rating criterion.')
      return
    }
    const cat: Category = {
      id: original?.id ?? uid(),
      name: name.trim(),
      emoji,
      color,
      criteria: cleaned,
      createdAt: original?.createdAt ?? Date.now(),
    }
    await db.categories.put(cat)
    navigate(-1)
  }

  async function remove() {
    if (!original) return
    const count = await db.entries.where('categoryId').equals(original.id).count()
    const msg =
      count > 0
        ? `Delete “${original.name}” and its ${count} entr${count === 1 ? 'y' : 'ies'} (incl. photos)? This can't be undone.`
        : `Delete “${original.name}”?`
    if (!confirm(msg)) return
    await deleteCategoryCascade(original.id)
    navigate('/categories', { replace: true })
  }

  if (!loaded) return null

  return (
    <div className="page">
      <header className="page-header form-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h2>{editId ? 'Edit category' : 'New category'}</h2>
      </header>

      <div className="card">
        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coffee, Ramen, Beaches…"
            autoFocus={!editId}
          />
        </label>
        <label className="field">
          <span>Emoji</span>
          <EmojiGrid value={emoji} onChange={setEmoji} />
        </label>
        <label className="field">
          <span>Color</span>
          <div className="swatches">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${color === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </label>
      </div>

      <div className="card">
        <h3 className="card-title">Rating criteria</h3>
        <p className="muted small">
          What do you want to score, 1–5 stars each? The overall rating is their average.
        </p>
        {criteria.map((c, i) => (
          <div className="criterion-row" key={c.id}>
            <input
              value={c.name}
              onChange={(e) => setCriterionName(c.id, e.target.value)}
              placeholder={['e.g. Taste', 'e.g. Atmosphere', 'e.g. Value'][i] ?? 'Criterion name'}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setCriteria((cs) => cs.filter((x) => x.id !== c.id))}
              aria-label="Remove criterion"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost block"
          onClick={() => setCriteria((cs) => [...cs, { id: uid(), name: '' }])}
        >
          + Add criterion
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="btn primary block" onClick={save}>
        {editId ? 'Save changes' : 'Create category'}
      </button>
      {editId && original && (
        <button className="btn danger-ghost block" onClick={remove}>
          Delete category
        </button>
      )}
    </div>
  )
}
