export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value.toFixed(1)} of 5 stars`}>
      <span className="stars-bg" aria-hidden>★★★★★</span>
      <span className="stars-fill" style={{ width: `${pct}%` }} aria-hidden>★★★★★</span>
    </span>
  )
}
