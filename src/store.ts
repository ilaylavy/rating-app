import { useSyncExternalStore } from 'react'

const KEY = 'triprate-active-trip'
const listeners = new Set<() => void>()

export function getActiveTripId(): string | null {
  return localStorage.getItem(KEY)
}

export function setActiveTripId(id: string | null) {
  if (id) localStorage.setItem(KEY, id)
  else localStorage.removeItem(KEY)
  listeners.forEach((l) => l())
}

export function useActiveTripId() {
  return useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, getActiveTripId)
}
