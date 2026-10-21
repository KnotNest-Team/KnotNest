import { fmtDate, inr } from '../utils/format';
import { MODE_LABEL } from '../utils/pricing';

const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' });

/** "3 days · 15–17 Feb 2027" summary for a booking (single-day bookings show their date). */
export const daysSummary = (b) => {
  const days = b.days?.length ? b.days : [{ date: b.weddingDate }];
  if (days.length === 1) return fmtDate(days[0].date);
  return `${days.length} days · ${short(days[0].date)} to ${fmtDate(days.at(-1).date)}`;
};

/** Every event the booking covers ("Haldi, Mehendi, Sangeet"). */
export const eventsSummary = (b) => [...new Set((b.days || []).flatMap((d) => (d.events?.length ? d.events.map((e) => e.name) : d.eventName ? [d.eventName] : [])))].join(', ');

/** Per-day breakdown: date, booking type, events with times, package and price. */
export default function BookingDays({ booking, compact = false }) {
  const withEvents = booking.days?.some((d) => d.events?.length);
  if (!(booking.days?.length > 1) && !withEvents) return null;
  return (
    <ul className={`mt-2 divide-y divide-ink/5 rounded-xl bg-ivory/70 px-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      {booking.days.map((d) => (
        <li key={d.date} className="py-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-ink"><b className="font-medium">{fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
              {d.mode && d.mode !== 'date' ? <span className="text-ink-2"> · {MODE_LABEL[d.mode]}</span> : d.eventName && <span className="text-ink-2"> · {d.eventName}</span>}</span>
            <span className="text-muted">{d.packageName && `${d.packageName} · `}{inr(d.amount)}</span>
          </div>
          {d.events?.length > 0 && (
            <p className="text-muted">{d.events.map((e) => `${e.name}${e.time ? ` (${e.time})` : ''}`).join(' · ')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
