import { BadgePercent, Info, Lock, AlertTriangle, PackageCheck } from 'lucide-react';
import { inr, fmtDate } from '../utils/format';
import { MODE_LABEL, dayTitle } from '../utils/pricing';
import BookingDays from './BookingDays';

const Row = ({ label, value, strong, muted, className = '' }) => (
  <div className={`flex items-baseline justify-between gap-3 ${className}`}>
    <span className={muted ? 'text-muted' : strong ? 'font-medium text-ink' : 'text-ink-2'}>{label}</span>
    <span className={strong ? 'font-display text-2xl text-maroon' : muted ? 'text-muted' : 'text-ink'}>{value}</span>
  </div>
);

/**
 * Price breakdown for a quote item or a saved booking: every day with its events and individual prices,
 * full-day package prices, each discount with the reason it applies, and the final payable amount.
 * Older bookings without a breakdown fall back to the per-day list.
 */
export default function PriceBreakdown({ item, booking, compact = false, showDays = true }) {
  const src = item || booking;
  const p = src?.pricing;
  if (!p || !(p.version >= 2)) return booking ? <BookingDays booking={booking} compact={compact} /> : null;
  const days = src.days || [];
  const adjusted = booking && booking.amount !== p.final;
  const text = compact ? 'text-xs' : 'text-sm';
  return (
    <div className={`grid gap-3 font-sans ${text}`}>
      {showDays && days.map((d) => (
        <section key={String(d.date)} className="rounded-xl border border-ink/10 bg-ivory/60 p-3">
          <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-ink">{dayTitle(d.date)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${d.mode === 'full_day' ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10'}`}>{MODE_LABEL[d.mode] || 'Whole date'}</span>
          </header>
          {d.events?.length ? (
            <ul className="divide-y divide-ink/5">
              {d.events.map((e) => (
                <li key={String(e.event || e.name)} className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-ink-2"><span className="text-ink">{e.name}</span>{e.time && <span className="text-muted"> · {e.time}</span>}{e.packageName && <span className="text-muted"> · {e.packageName}</span>}</span>
                  <span className="text-ink">{inr(e.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex justify-between text-ink-2"><span>{d.eventName || 'Booking for the day'}{d.packageName && ` · ${d.packageName}`}</span><span className="text-ink">{inr(d.subtotal ?? d.amount)}</span></p>
          )}
          {d.events?.length > 1 && <Row className="mt-1 border-t border-ink/10 pt-1" label="Day subtotal" value={inr(d.subtotal)} muted />}
          {d.packagePrice != null && d.packagePrice < d.subtotal && (
            <p className="mt-1 flex items-start gap-1.5 text-emerald-700"><PackageCheck size={14} className="mt-0.5 shrink-0" />Vendor's full-day package price {inr(d.packagePrice)} (saves {inr(d.subtotal - d.packagePrice)})</p>
          )}
        </section>
      ))}

      <div className="grid gap-1.5 rounded-xl bg-white p-3 ring-1 ring-ink/10">
        <Row label="Total before discount" value={inr(p.subtotal)} />
        {p.packageSavings > 0 && <Row label="Full-day package prices" value={`−${inr(p.packageSavings)}`} />}
        {p.discounts?.map((x, i) => (
          <div key={i} className={x.amount ? '' : 'opacity-60'}>
            <Row label={<span className="inline-flex items-center gap-1.5"><BadgePercent size={14} className="text-gold" />{x.label} ({x.percent}%){x.day && <span className="text-muted"> · {dayTitle(x.day)}</span>}</span>} value={x.amount ? `−${inr(x.amount)}` : inr(0)} />
            <p className={`pl-5 ${compact ? 'text-[11px]' : 'text-xs'} ${x.trimmed ? 'text-amber-700' : 'text-muted'}`}>{x.reason}</p>
          </div>
        ))}
        {!p.discounts?.length && !p.packageSavings && <p className="text-xs text-muted">No discount applies to this selection.</p>}
        {p.totalDiscount > 0 && <Row label="Total discount" value={`−${inr(p.totalDiscount)}`} className="border-t border-ink/10 pt-1.5" />}
        {p.capped && <p className="flex items-start gap-1.5 text-xs text-amber-700"><Info size={13} className="mt-0.5 shrink-0" />Discounts are limited to {p.maxPercent}% of the booking value in total.</p>}
        <Row label={adjusted ? 'Quoted price' : 'Final payable amount'} value={inr(p.final)} strong={!adjusted} className="border-t border-ink/10 pt-1.5" />
        {adjusted && (
          <>
            {(p.adjustments || []).map((a, i) => <p key={i} className="text-xs text-muted">{a.by === 'vendor' ? 'Vendor' : 'KnotNest'} changed the price from {inr(a.from)} to {inr(a.to)}{a.note && `: "${a.note}"`}</p>)}
            <Row label="Final payable amount" value={inr(booking.amount)} strong />
          </>
        )}
        {booking && p.confirmedAt && <p className="flex items-center gap-1.5 text-xs text-emerald-700"><Lock size={12} />Price locked on {fmtDate(p.confirmedAt)}. Later changes to prices or discounts don't affect it.</p>}
      </div>
    </div>
  );
}

/** Alerts raised when the couple moved or removed a booked event. */
export function BookingAlerts({ booking }) {
  const open = (booking.alerts || []).filter((a) => !a.resolved);
  if (!open.length) return null;
  return (
    <ul className="mt-2 grid gap-1.5">
      {open.map((a, i) => <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{a.message}</li>)}
    </ul>
  );
}
