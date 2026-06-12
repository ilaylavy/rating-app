import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function Categories() {
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray())
  const counts = useLiveQuery(async () => {
    const entries = await db.entries.toArray()
    const map: Record<string, number> = {}
    for (const e of entries) map[e.categoryId] = (map[e.categoryId] ?? 0) + 1
    return map
  })

  if (!categories) return null

  return (
    <div className="page">
      <header className="page-header">
        <h2>Categories</h2>
      </header>
      <p className="muted intro">
        Each category has its own rating criteria. Tweak them or create your own — “Ramen”,
        “Street art”, anything.
      </p>
      <div className="list">
        {categories.map((c) => (
          <Link key={c.id} to={`/categories/${c.id}`} className="list-row">
            <span className="list-emoji" style={{ background: `${c.color}26` }}>{c.emoji}</span>
            <span className="list-main">
              <span>{c.name}</span>
              <span className="muted small">{c.criteria.map((cr) => cr.name).join(' · ')}</span>
            </span>
            <span className="muted small">{counts?.[c.id] ?? 0}</span>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>
      <Link to="/categories/new" className="btn primary block">
        + New category
      </Link>
    </div>
  )
}
