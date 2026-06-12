export function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Current local time formatted for an <input type="datetime-local"> value. */
export function nowLocalInput(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** ISO string -> value usable in <input type="datetime-local">. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return nowLocalInput()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** Average of the rated (>0) criteria, 0 when nothing is rated. */
export function overallOf(ratings: Record<string, number>): number {
  const vals = Object.values(ratings).filter((v) => v > 0)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
