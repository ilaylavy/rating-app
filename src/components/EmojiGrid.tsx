const EMOJIS = [
  '☕', '🍜', '🍕', '🍣', '🍰', '🍺', '🍸', '🍷', '🥐', '🍦',
  '🏛️', '🏯', '⛩️', '🗿', '🖼️', '🎭', '🏖️', '🏔️', '🌋', '🌊',
  '🎟️', '🎢', '🚶', '🚲', '🛶', '🤿', '🎿', '🧗', '🛍️', '💆',
  '🛏️', '🏨', '⛺', '🚆', '✈️', '🚗', '🌃', '🎶', '📸', '⭐',
]

export function EmojiGrid({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="emoji-grid">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className={value === e ? 'on' : ''}
          onClick={() => onChange(e)}
          aria-label={`emoji ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
