/**
 * Vendor comparison prototype. For one category at a time it turns every shortlisted vendor's pricing into a
 * full quote for the couple's need, ranks them with weights the couple can adjust, and explains each rank.
 */
import { useMemo, useState } from 'react';
import { compareVendors, explain, priceGap, labelOf, DEFAULT_WEIGHTS } from '../lib/vendorCompare.js';
import { inr, inrShort, cx } from '../lib/format.js';
import { Panel, Tag, Tabs, Bar } from './ui.jsx';

const WEIGHT_LABEL = { price: 'Price', rating: 'Reviews', coverage: 'Services included', flexibility: 'Cancellation terms', response: 'Reply speed' };

export default function VendorComparison({ vendors, needs, date }) {
  const categories = [...new Set(vendors.map((v) => v.category))];
  const [category, setCategory] = useState(categories[0]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [open, setOpen] = useState(null); // vendor id whose quote lines are shown

  const need = needs[category] || {};
  const rows = useMemo(() => compareVendors(vendors.filter((v) => v.category === category), need, { date, weights }), [vendors, category, need, date, weights]);
  const notes = useMemo(() => explain(rows), [rows]);
  const gaps = useMemo(() => priceGap(rows), [rows]);
  const best = rows.find((r) => r.available && !r.dominated);
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);

  return (
    <div className="space-y-6">
      <Tabs tabs={categories.map((c) => ({ id: c, label: c }))} value={category} onChange={(c) => { setCategory(c); setOpen(null); }} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel title={`${category}: ${rows.length} shortlisted`} action={best && <Tag tone="brand">Suggested: {best.vendor.name}</Tag>}>
          <p className="mb-4 text-sm text-muted">
            Quoted for {[need.guests && `${need.guests} guests`, need.hours && `${need.hours} hours`, need.events && `${need.events} events`].filter(Boolean).join(', ') || 'the full package'}
            {need.required?.length ? `, needing ${need.required.map(labelOf).join(', ')}` : ''}. Prices include travel and GST.
          </p>
          <ol className="space-y-3">
            {rows.map((r) => (
              <li key={r.vendor.id} className={cx('rounded-xl border p-4', r.available ? 'border-ink/10' : 'border-dashed border-ink/20 opacity-70')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-ink"><span className="mr-2 text-muted">#{r.rank}</span>{r.vendor.name}</p>
                    <p className="text-xs text-muted">
                      {r.vendor.rating.toFixed(1)} from {r.vendor.reviews} reviews (counts as {r.metrics.rating.toFixed(2)}) · replies in about {r.vendor.responseHours} h · {r.vendor.cancellation} cancellation · {r.vendor.advancePercent}% advance
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl text-ink">{inr(r.quote.total)}</p>
                    <p className="text-xs text-muted">{gaps[r.vendor.id]?.amount ? `+${inrShort(gaps[r.vendor.id].amount)} (${gaps[r.vendor.id].percent}%) vs lowest` : r.available ? 'Lowest available' : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><Bar value={r.score} max={100} tone={r.available ? 'brand' : 'gold'} label={`${r.vendor.name} score`} /></div>
                  <span className="w-14 text-right text-sm font-medium text-ink">{r.score}/100</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(notes[r.vendor.id] || []).map((n) => <Tag key={n} tone={/booked|Missing|every count/.test(n) ? 'warn' : /Lowest|Best/.test(n) ? 'good' : 'neutral'}>{n}</Tag>)}
                </div>
                <button type="button" onClick={() => setOpen(open === r.vendor.id ? null : r.vendor.id)} aria-expanded={open === r.vendor.id} className="mt-3 text-xs text-maroon hover:underline">
                  {open === r.vendor.id ? 'Hide quote' : 'Show quote'}
                </button>
                {open === r.vendor.id && (
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {r.quote.lines.map((l) => <tr key={l.label} className="border-t border-ink/10"><td className="py-1.5 text-ink-2">{l.label}</td><td className="text-right">{inr(l.amount)}</td></tr>)}
                      <tr className="border-t border-ink/20 font-medium"><td className="py-1.5">Total</td><td className="text-right">{inr(r.quote.total)}</td></tr>
                      <tr><td className="py-1 text-muted">Advance to book ({r.vendor.advancePercent}%)</td><td className="text-right text-muted">{inr(r.quote.advance)}</td></tr>
                    </tbody>
                  </table>
                )}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="What matters most">
          <div className="space-y-4">
            {Object.keys(DEFAULT_WEIGHTS).map((k) => (
              <label key={k} className="block text-sm">
                <span className="flex justify-between text-ink-2"><span>{WEIGHT_LABEL[k]}</span><span className="text-muted">{totalWeight ? Math.round((weights[k] / totalWeight) * 100) : 0}%</span></span>
                <input type="range" min={0} max={1} step={0.05} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="mt-1 w-full accent-maroon" />
              </label>
            ))}
            <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)} className="text-xs text-maroon hover:underline">Reset weights</button>
            <p className="text-xs text-muted">Vendors already booked on your date stay in the list for reference but are ranked last.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
