import { db, type Photo } from '../db'

interface BackupPhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string
  thumb: string
}

interface Backup {
  app: 'triprate'
  version: 1
  exportedAt: string
  trips: unknown[]
  categories: unknown[]
  entries: unknown[]
  photos: BackupPhoto[]
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL)
  return res.blob()
}

export async function exportBackup(): Promise<Blob> {
  const [trips, categories, entries, photos] = await Promise.all([
    db.trips.toArray(),
    db.categories.toArray(),
    db.entries.toArray(),
    db.photos.toArray(),
  ])
  const backup: Backup = {
    app: 'triprate',
    version: 1,
    exportedAt: new Date().toISOString(),
    trips,
    categories,
    entries,
    photos: await Promise.all(
      photos.map(async (p) => ({
        ...p,
        blob: await blobToDataURL(p.blob),
        thumb: await blobToDataURL(p.thumb),
      })),
    ),
  }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Replaces ALL existing data with the contents of the backup file. */
export async function importBackup(file: File): Promise<{ trips: number; entries: number }> {
  const data = JSON.parse(await file.text()) as Backup
  if (data.app !== 'triprate' || !Array.isArray(data.entries)) {
    throw new Error('Not a valid TripRate backup file')
  }
  const photos: Photo[] = await Promise.all(
    (data.photos ?? []).map(async (p) => ({
      ...p,
      blob: await dataURLToBlob(p.blob),
      thumb: await dataURLToBlob(p.thumb),
    })),
  )
  await db.transaction('rw', db.trips, db.categories, db.entries, db.photos, async () => {
    await Promise.all([db.trips.clear(), db.categories.clear(), db.entries.clear(), db.photos.clear()])
    await db.trips.bulkAdd(data.trips as never[])
    await db.categories.bulkAdd(data.categories as never[])
    await db.entries.bulkAdd(data.entries as never[])
    await db.photos.bulkAdd(photos)
  })
  return { trips: data.trips.length, entries: data.entries.length }
}
