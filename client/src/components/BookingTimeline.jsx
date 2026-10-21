import { STEP_TEXT, BY } from '../utils/bookingStatus';

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Every step of a booking: who did what, when, with their note. */
export default function BookingTimeline({ history = [], compact = false }) {
  if (!history.length) return null;
  return (
    <ol className={`relative grid gap-3 border-l border-ink/15 pl-4 ${compact ? 'text-xs' : 'text-sm'}`}>
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${i === history.length - 1 ? 'bg-maroon' : 'bg-ink/25'}`} />
          <p className="text-ink"><span className="font-medium">{STEP_TEXT[h.status] || h.status}</span> <span className="text-muted">· {BY[h.by] || h.by} · {when(h.at)}</span></p>
          {h.note && <p className="mt-0.5 font-serif italic text-ink-2">"{h.note}"</p>}
        </li>
      ))}
    </ol>
  );
}
