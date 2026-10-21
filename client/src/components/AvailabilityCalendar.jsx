import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const key = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Month calendar. `unavailable`: string[] of YYYY-MM-DD. Pass onToggle to make it editable (vendor) or onSelect (customer). */
export default function AvailabilityCalendar({ unavailable = [], onToggle, onSelect, selected }) {
  const now = new Date();
  const picked = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const start = picked.length ? new Date(`${[...picked].sort()[0]}T00:00:00`) : now;
  const [cur, setCur] = useState({ y: start.getFullYear(), m: start.getMonth() });
  // when a day is picked from outside the calendar (e.g. an event chip), show its month
  const lastPicked = picked.at(-1);
  useEffect(() => {
    if (!lastPicked) return;
    const d = new Date(`${lastPicked}T00:00:00`);
    setCur((c) => (c.y === d.getFullYear() && c.m === d.getMonth() ? c : { y: d.getFullYear(), m: d.getMonth() }));
  }, [lastPicked, picked.length]);
  const first = new Date(cur.y, cur.m, 1).getDay();
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());
  const taken = new Set(unavailable);
  const go = (d) => setCur(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });

  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="w-full max-w-sm font-sans">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="rounded-full p-1.5 hover:bg-ink/5"><ChevronLeft size={18} /></button>
        <p className="font-display text-xl text-ink">{new Date(cur.y, cur.m).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => go(1)} aria-label="Next month" className="rounded-full p-1.5 hover:bg-ink/5"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{DOW.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const k = key(cur.y, cur.m, d);
          const isTaken = taken.has(k);
          const past = k < todayKey;
          const isSel = picked.includes(k);
          const clickable = (onToggle && !past) || (onSelect && !past && !isTaken);
          return (
            <button type="button" key={k} disabled={!clickable}
              onClick={() => (onToggle ? onToggle(k) : onSelect?.(k))}
              title={isTaken ? 'Unavailable' : past ? '' : 'Available'} aria-pressed={onSelect ? isSel : undefined}
              className={`aspect-square rounded-lg text-sm transition ${isSel ? 'bg-maroon text-ivory' : isTaken ? 'bg-maroon/15 text-maroon line-through' : past ? 'text-ink/25' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-100" /> Available</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-maroon/20" /> Unavailable</span>
      </div>
    </div>
  );
}
