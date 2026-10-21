import { Star } from 'lucide-react';

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-gold text-gold' : 'text-ink/20'} />)}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} role="radio" aria-checked={value === i}>
          <Star size={28} className={i <= value ? 'fill-gold text-gold' : 'text-ink/25 hover:text-gold'} />
        </button>
      ))}
    </div>
  );
}
