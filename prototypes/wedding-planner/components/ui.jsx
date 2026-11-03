/**
 * Minimal building blocks styled with the KnotNest Tailwind tokens (maroon, gold, ivory, ink).
 * They look like client/src/components/Card.jsx and Badge.jsx but are separate copies, so this folder
 * does not import anything from the application.
 */
import { cx } from '../lib/format.js';

export function Panel({ title, action, children, className }) {
  return (
    <section className={cx('rounded-2xl border border-ink/10 bg-white shadow-card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <h3 className="font-display text-xl font-medium text-ink">{title}</h3>{action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES = {
  neutral: 'bg-ink/5 text-ink-2', good: 'bg-emerald-50 text-emerald-700', warn: 'bg-amber-50 text-amber-800',
  bad: 'bg-red-50 text-red-700', brand: 'bg-maroon/10 text-maroon', gold: 'bg-gold/15 text-ink-2',
};
export const Tag = ({ tone = 'neutral', children }) => <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>;

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-cream px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={cx('mt-1 font-display text-2xl', tone === 'bad' ? 'text-red-700' : 'text-ink')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Horizontal bar: `value` of `max`, with an optional marker (e.g. the planned amount). */
export function Bar({ value, max, marker, tone = 'brand', label }) {
  const w = max ? Math.min(100, (value / max) * 100) : 0;
  const m = marker != null && max ? Math.min(100, (marker / max) * 100) : null;
  const fill = { brand: 'bg-maroon', gold: 'bg-gold', bad: 'bg-red-600', good: 'bg-emerald-600' }[tone];
  return (
    <div className="relative h-2.5 w-full rounded-full bg-ink/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={cx('h-full rounded-full', fill)} style={{ width: `${w}%` }} />
      {m != null && <div className="absolute -top-1 w-0.5 bg-ink" style={{ left: `${m}%`, height: '18px' }} title="Planned" />}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('rounded-full px-4 py-2 text-sm font-medium transition', value === t.id ? 'bg-maroon text-ivory' : 'border border-ink/20 bg-white text-ink hover:border-maroon hover:text-maroon')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
