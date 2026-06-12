import { db, uid, type Category } from './db'

const SEED_FLAG = 'triprate-seeded'

const defaults: Array<Pick<Category, 'name' | 'emoji' | 'color'> & { criteria: string[] }> = [
  { name: 'Coffee', emoji: '☕', color: '#b08968', criteria: ['Taste', 'Vibe', 'Service', 'Value'] },
  { name: 'Food', emoji: '🍜', color: '#e0716f', criteria: ['Taste', 'Atmosphere', 'Service', 'Value'] },
  { name: 'Sights', emoji: '🏛️', color: '#5b9bd5', criteria: ['Beauty', 'Uniqueness', 'Experience'] },
  { name: 'Activities', emoji: '🎟️', color: '#7fb069', criteria: ['Fun', 'Organization', 'Value'] },
  { name: 'Stays', emoji: '🛏️', color: '#8a7fd6', criteria: ['Comfort', 'Cleanliness', 'Location', 'Value'] },
]

/** Seed the default categories exactly once per device. */
export async function ensureSeeded() {
  if (localStorage.getItem(SEED_FLAG)) return
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(
      defaults.map((c, i) => ({
        id: uid(),
        name: c.name,
        emoji: c.emoji,
        color: c.color,
        criteria: c.criteria.map((name) => ({ id: uid(), name })),
        createdAt: Date.now() + i,
      })),
    )
  }
  localStorage.setItem(SEED_FLAG, '1')
}
