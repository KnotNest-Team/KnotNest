import { CalendarDays, Check, Clock, Sparkles } from 'lucide-react';
import { dayTitle, vendorOffers } from '../utils/pricing';

/**
 * Wedding days with their events. For each day the couple books the entire day (every eligible event) or
 * ticks individual events. value: { 'YYYY-MM-DD': { mode: 'full_day'|'events', events: [eventId] } }.
 * `vendor` (optional) greys out events the vendor does not cover and full days it does not sell.
 */
export default function DayEventPicker({ days = [], value = {}, onChange, vendor, rules, fullDayAllowed = true, unavailable = [] }) {
  const blocked = new Set(unavailable);
  const fullDayOk = fullDayAllowed && vendor?.fullDay?.enabled !== false;
  const set = (date, v) => {
    const next = { ...value };
    if (!v) delete next[date]; else next[date] = v;
    onChange(next);
  };
  const tiers = rules?.multiEvent?.enabled ? [...(rules.multiEvent.tiers || [])].sort((a, b) => a.minEvents - b.minEvents) : [];
  const on = rules?.enabled !== false;

  if (!days.length) return null;
  return (
    <div className="grid gap-3">
      {days.map((d) => {
        const eligible = d.events.filter((e) => !vendor || vendorOffers(vendor, e.name));
        const cur = value[d.date];
        const isBlocked = blocked.has(d.date);
        const canFull = fullDayOk && eligible.length > 0 && !isBlocked;
        const toggleDay = () => (cur ? set(d.date, null) : set(d.date, canFull && eligible.length > 1 ? { mode: 'full_day', events: [] } : { mode: 'events', events: eligible.slice(0, 1).map((e) => e._id) }));
        const toggleEvent = (id) => {
          const list = cur?.mode === 'events' ? cur.events : [];
          const nextList = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
          set(d.date, nextList.length ? { mode: 'events', events: nextList } : null);
        };
        return (
          <section key={d.date} className={`rounded-2xl border p-4 transition ${cur ? 'border-maroon/40 bg-white shadow-card' : 'border-ink/10 bg-white/70'} ${isBlocked ? 'opacity-60' : ''}`}>
            <header className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={toggleDay} disabled={isBlocked} aria-pressed={!!cur} className="flex items-center gap-3 text-left disabled:cursor-not-allowed">
                <span className={`grid h-6 w-6 place-items-center rounded-md border ${cur ? 'border-maroon bg-maroon text-ivory' : 'border-ink/25 bg-white'}`}>{cur && <Check size={15} />}</span>
                <span>
                  <span className="block font-display text-xl text-ink">{dayTitle(d.date)}</span>
                  <span className="block text-xs text-muted">{d.events.length} {d.events.length === 1 ? 'event' : 'events'}{isBlocked && ' · vendor not available'}</span>
                </span>
              </button>
              {cur && (
                <div className="inline-flex rounded-full bg-ivory p-1 text-xs ring-1 ring-ink/10" role="group" aria-label="Booking type">
                  <button type="button" disabled={!canFull} onClick={() => set(d.date, { mode: 'full_day', events: [] })} title={!canFull ? 'Full-day package not offered' : ''}
                    className={`rounded-full px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${cur.mode === 'full_day' ? 'bg-maroon text-ivory' : 'text-ink-2 hover:text-maroon'}`}>Book entire day</button>
                  <button type="button" onClick={() => set(d.date, { mode: 'events', events: cur.mode === 'events' ? cur.events : [] })}
                    className={`rounded-full px-3 py-1.5 transition ${cur.mode === 'events' ? 'bg-maroon text-ivory' : 'text-ink-2 hover:text-maroon'}`}>Select events</button>
                </div>
              )}
            </header>
            {cur?.mode === 'full_day' && on && rules?.fullDay?.enabled && eligible.length > 1 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8a6330]"><Sparkles size={13} />All {eligible.length} events included{vendor?.fullDay?.price > 0 ? ' at the vendor\'s full-day package price' : `, ${rules.fullDay.percent}% full-day discount`}</p>
            )}
            {cur?.mode === 'events' && on && tiers.length > 0 && (
              <p className="mt-2 text-xs text-muted">Several events with the same vendor on one day: {tiers.map((t) => `${t.minEvents}+ events ${t.percent}% off`).join(' · ')}</p>
            )}
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {d.events.map((e) => {
                const offered = !vendor || vendorOffers(vendor, e.name);
                const checked = cur?.mode === 'full_day' ? offered : !!cur?.events?.includes(e._id);
                const locked = cur?.mode === 'full_day' || !offered || isBlocked;
                return (
                  <li key={e._id}>
                    <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 ring-1 transition ${checked ? 'bg-maroon/5 ring-maroon/30' : 'bg-white ring-ink/10 hover:ring-maroon/40'} ${locked ? 'cursor-default' : ''} ${!offered ? 'opacity-50' : ''}`}>
                      <input type="checkbox" className="mt-1 accent-[#6E1E2A]" checked={checked} disabled={locked} onChange={() => toggleEvent(e._id)} />
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">{e.name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted"><Clock size={11} />{e.time || 'Time not set (holds the whole day)'}</span>
                        {!offered && <span className="block text-xs text-muted">Not offered by this vendor</span>}
                        {e.booked?.length > 0 && <span className="mt-0.5 block text-xs text-emerald-700">Booked: {e.booked.map((b) => `${b.vendor}${b.category ? ` (${b.category})` : ''}`).join(', ')}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export const NoEventsYet = ({ action }) => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-ink/15 bg-ivory/50 px-6 py-8 text-center font-sans">
    <CalendarDays className="text-gold" size={26} />
    <p className="mt-2 font-display text-2xl text-ink">Add your wedding events first</p>
    <p className="mt-1 max-w-sm text-sm text-muted">Haldi, mehendi, sangeet, wedding and reception with their dates and times. Then book a whole day or just the events you need.</p>
    {action}
  </div>
);
