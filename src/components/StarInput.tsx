export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="star-input" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n === value ? 0 : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
