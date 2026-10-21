import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Info } from 'lucide-react';
import useVendor from './useVendor';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import { Async } from '../components/States';
import { inr } from '../utils/format';

const COMMON = ['Roka', 'Engagement', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Baraat', 'Wedding', 'Reception', 'Puja'];

/** Per-event prices, the events the vendor covers, and the full-day package (used by flexible wedding bookings). */
export default function Pricing() {
  const v = useVendor();
  return (
    <>
      <PageHeader title="Event pricing" subtitle="Couples can book you for a whole wedding day or for individual events. Set a price per event and decide whether you sell full-day packages." />
      <Async state={v}>{() => <Editor vendor={v.vendor} save={v.save} />}</Async>
    </>
  );
}

function Editor({ vendor, save }) {
  const [rows, setRows] = useState([]);
  const [offered, setOffered] = useState([]);
  const [custom, setCustom] = useState('');
  const [fullDay, setFullDay] = useState({ enabled: true, price: 0 });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setRows((vendor.eventPricing || []).map((r) => ({ ...r })));
    setOffered(vendor.eventsOffered || []);
    setFullDay({ enabled: vendor.fullDay?.enabled !== false, price: vendor.fullDay?.price || 0 });
  }, [vendor]);
  const setRow = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const toggle = (name) => setOffered((o) => (o.includes(name) ? o.filter((x) => x !== name) : [...o, name]));
  const submit = async () => {
    setBusy(true);
    await save({ eventPricing: rows.filter((r) => r.eventName.trim()).map((r) => ({ eventName: r.eventName.trim(), price: Number(r.price) || 0 })), eventsOffered: offered, fullDay: { enabled: fullDay.enabled, price: Number(fullDay.price) || 0 } }, 'Event pricing saved');
    setBusy(false);
  };
  const missing = COMMON.filter((n) => !rows.some((r) => r.eventName.toLowerCase() === n.toLowerCase()));

  return (
    <div className="grid gap-6 font-sans lg:grid-cols-2">
      <Card title="Price per event" className="lg:row-span-2">
        <p className="mb-4 text-sm text-muted">Matched by event name, so "Wedding" also prices "Wedding (Pheras)". Events without a price use your starting price of <b className="text-ink">{inr(vendor.startingPrice)}</b>.</p>
        <ul className="grid gap-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <input className="kn-input flex-1 !py-2" value={r.eventName} onChange={(e) => setRow(i, { eventName: e.target.value })} placeholder="Event name" aria-label="Event name" list="kn-events" />
              <span className="text-sm text-muted">₹</span>
              <input className="kn-input !w-32 !py-2" type="number" min="0" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} aria-label={`Price for ${r.eventName || 'event'}`} />
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
        <datalist id="kn-events">{COMMON.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setRows((rs) => [...rs, { eventName: '', price: vendor.startingPrice || 0 }])}>Add event</Button>
          {missing.slice(0, 6).map((n) => <button key={n} type="button" onClick={() => setRows((rs) => [...rs, { eventName: n, price: vendor.startingPrice || 0 }])} className="rounded-full bg-white px-3 py-1 text-xs text-ink-2 ring-1 ring-ink/10 hover:ring-maroon">+ {n}</button>)}
        </div>
      </Card>

      <Card title="Events you cover">
        <p className="mb-3 text-sm text-muted">Leave everything unselected if you work at every kind of event. Couples can't book you for events you don't cover.</p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...COMMON, ...offered])].map((n) => (
            <button key={n} type="button" aria-pressed={offered.includes(n)} onClick={() => toggle(n)} className={`rounded-full px-3 py-1.5 text-xs transition ${offered.includes(n) ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/15 hover:ring-maroon'}`}>{n}</button>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { toggle(custom.trim()); setCustom(''); } }}>
          <input className="kn-input !py-2" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Another event, e.g. Mayra" aria-label="Another event" />
          <Button size="sm" variant="secondary" type="submit">Add</Button>
        </form>
        <p className="mt-3 text-xs text-muted">{offered.length ? `Bookable for: ${offered.join(', ')}` : 'Bookable for every event.'}</p>
      </Card>

      <Card title="Full-day package">
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={fullDay.enabled} onChange={(e) => setFullDay((f) => ({ ...f, enabled: e.target.checked }))} />
          Offer full-day packages (every event you cover on one wedding day)
        </label>
        {fullDay.enabled && (
          <label className="mt-4 block"><span className="kn-label">Your full-day price (₹, optional)</span>
            <input className="kn-input" type="number" min="0" value={fullDay.price} onChange={(e) => setFullDay((f) => ({ ...f, price: e.target.value }))} />
            <span className="mt-1 block text-xs text-muted">0 = the day's event prices with KnotNest's full-day discount. A price here is used when it is lower than the day's event prices (no extra KnotNest full-day discount on top).</span>
          </label>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" />Full-day bookings hold your whole day. Individual events hold only their time, so you can take another couple's event at a different time on the same day.</p>
      </Card>

      <div className="lg:col-span-2"><Button icon={Save} loading={busy} onClick={submit}>Save event pricing</Button></div>
    </div>
  );
}
