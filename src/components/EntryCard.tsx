import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type Entry } from '../db'
import { useBlobUrl } from '../hooks'
import { fmtDate } from '../utils/format'
import { Stars } from './Stars'

export function EntryCard({ entry, category }: { entry: Entry; category?: Category }) {
  const photo = useLiveQuery(() => db.photos.where('entryId').equals(entry.id).first(), [entry.id])
  const url = useBlobUrl(photo?.thumb)
  return (
    <Link to={`/entry/${entry.id}`} className="entry-card">
      {url ? (
        <img src={url} alt="" className="entry-card-img" />
      ) : (
        <div className="entry-card-img entry-card-ph" style={{ background: `${category?.color ?? '#444'}26` }}>
          {category?.emoji ?? '⭐'}
        </div>
      )}
      <div className="entry-card-body">
        <div className="entry-card-title">{entry.title}</div>
        <div className="entry-card-meta">
          {category && (
            <span className="badge" style={{ background: `${category.color}26`, color: category.color }}>
              {category.emoji} {category.name}
            </span>
          )}
          <span className="muted">{fmtDate(entry.date)}</span>
        </div>
        <div className="entry-card-rating">
          <Stars value={entry.overall} />
          <span className="rating-num">{entry.overall > 0 ? entry.overall.toFixed(1) : '–'}</span>
        </div>
      </div>
    </Link>
  )
}
