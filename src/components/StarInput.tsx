import { useRef, useState } from 'react'

/**
 * 5-star rating input with half-star precision.
 * Tap the left half of a star for n−0.5, the right half for n, or drag
 * across the row to scrub in half-star steps. Tapping your current
 * rating again clears it.
 */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const [preview, setPreview] = useState<number | null>(null)
  const shown = preview ?? value

  function valueAt(clientX: number) {
    const el = rowRef.current
    if (!el) return 0
    const { left, width } = el.getBoundingClientRect()
    const raw = ((clientX - left) / width) * 5
    // left half of a star → n−0.5, center and right half → n
    return Math.min(5, Math.max(0.5, Math.floor(raw * 2) / 2 + 0.5))
  }

  function fillOf(n: number) {
    if (shown >= n) return 100
    if (shown >= n - 0.5) return 50
    return 0
  }

  return (
    <div className="star-input">
      <div
        ref={rowRef}
        className="star-row"
        role="radiogroup"
        onPointerDown={(e) => {
          dragging.current = true
          startX.current = e.clientX
          e.currentTarget.setPointerCapture(e.pointerId)
          setPreview(valueAt(e.clientX))
        }}
        onPointerMove={(e) => {
          if (dragging.current) setPreview(valueAt(e.clientX))
        }}
        onPointerUp={(e) => {
          if (!dragging.current) return
          dragging.current = false
          setPreview(null)
          const v = valueAt(e.clientX)
          const isTap = Math.abs(e.clientX - startX.current) < 6
          // a tap on the current rating clears it; a drag always commits
          onChange(isTap && v === value ? 0 : v)
        }}
        onPointerCancel={() => {
          dragging.current = false
          setPreview(null)
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value > n - 1 && value <= n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={(e) => {
              // keyboard activation only — pointer input is handled above
              if (e.detail === 0) onChange(n === value ? 0 : n)
            }}
          >
            <span className="star-glyph" aria-hidden>
              ★
              <span className="star-glyph-fill" style={{ width: `${fillOf(n)}%` }}>
                ★
              </span>
            </span>
          </button>
        ))}
      </div>
      <span className="star-value">{shown > 0 ? shown.toFixed(1) : ''}</span>
    </div>
  )
}
