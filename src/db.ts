import Dexie, { type EntityTable } from 'dexie'

export interface Criterion {
  id: string
  name: string
}

export interface Trip {
  id: string
  name: string
  emoji: string
  startDate?: string
  endDate?: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  criteria: Criterion[]
  createdAt: number
}

export interface Entry {
  id: string
  tripId: string
  categoryId: string
  title: string
  location?: string
  /** criterion id -> 1..5 (0 / missing = unrated) */
  ratings: Record<string, number>
  /** criterion id -> short note about that specific criterion */
  criterionNotes?: Record<string, string>
  overall: number
  note?: string
  date: string
  createdAt: number
  updatedAt: number
}

export interface Photo {
  id: string
  entryId: string
  blob: Blob
  thumb: Blob
  createdAt: number
}

export const db = new Dexie('triprate') as Dexie & {
  trips: EntityTable<Trip, 'id'>
  categories: EntityTable<Category, 'id'>
  entries: EntityTable<Entry, 'id'>
  photos: EntityTable<Photo, 'id'>
}

// DATA SAFETY — this database holds the user's ONLY copy of their data.
// App updates must never lose it:
//  - NEVER edit an existing version(n) schema in place. To change indexes,
//    add a new db.version(n + 1).stores({...}) (with .upgrade() if rows need
//    rewriting); Dexie then migrates existing data forward automatically.
//  - NEVER call db.delete(), table.clear() or lower the version number in
//    app code. Clearing is only allowed from the user-confirmed flows in
//    Settings (erase / import backup).
//  - New Entry/Category fields must be optional so old rows stay valid.
db.version(1).stores({
  trips: 'id, createdAt',
  categories: 'id, createdAt',
  entries: 'id, tripId, categoryId, date, createdAt',
  photos: 'id, entryId',
})

export const uid = () => crypto.randomUUID()

/** Delete an entry together with its photos. */
export async function deleteEntry(entryId: string) {
  await db.transaction('rw', db.entries, db.photos, async () => {
    await db.photos.where('entryId').equals(entryId).delete()
    await db.entries.delete(entryId)
  })
}

/** Delete a category and every entry (plus photos) recorded under it. */
export async function deleteCategoryCascade(categoryId: string) {
  await db.transaction('rw', db.categories, db.entries, db.photos, async () => {
    const ids = await db.entries.where('categoryId').equals(categoryId).primaryKeys()
    await db.photos.where('entryId').anyOf(ids).delete()
    await db.entries.where('categoryId').equals(categoryId).delete()
    await db.categories.delete(categoryId)
  })
}

/** Delete a trip and every entry (plus photos) recorded in it. */
export async function deleteTripCascade(tripId: string) {
  await db.transaction('rw', db.trips, db.entries, db.photos, async () => {
    const ids = await db.entries.where('tripId').equals(tripId).primaryKeys()
    await db.photos.where('entryId').anyOf(ids).delete()
    await db.entries.where('tripId').equals(tripId).delete()
    await db.trips.delete(tripId)
  })
}
