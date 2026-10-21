import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Info } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import { Async } from '../components/States';
import { errMsg, fmtDate } from '../utils/format';
import { DISCOUNT_LABEL } from '../utils/pricing';

const Num = ({ label, value, onChange, min = 0, max = 100, suffix = '%', hint }) => (
  <label className="block"><span className="kn-label">{label}</span>
    <span className="flex items-center gap-2"><input className="kn-input !w-28" type="number" min={min} max={max} step="0.5" value={value} onChange={(e) => onChange(e.target.value)} /><span className="text-sm text-muted">{suffix}</span></span>
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);
const Toggle = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>
);

/** Admin: full-day packages, discount percentages, eligibility, stacking and the maximum combined discount. */
export default function Discounts() {
  const state = useFetch(() => adminApi.platformSettings());
  return (
    <>
      <PageHeader title="Discounts & packages" subtitle="Rules the pricing engine uses for every new quote. Bookings already requested or confirmed keep the price and rules saved with them." />
      <Async state={state}>{({ settings }) => <Form initial={settings} onSaved={(s) => state.setData({ settings: s })} />}</Async>
    </>
  );
}

function Form({ initial, onSaved }) {
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(initial), [initial]);
  const d = s.discounts;
  const setD = (patch) => setS((x) => ({ ...x, discounts: { ...x.discounts, ...patch } }));
  const setPart = (k, patch) => setD({ [k]: { ...d[k], ...patch } });
  const move = (i, dir) => { const p = [...d.priority]; const j = i + dir; if (j < 0 || j >= p.length) return; [p[i], p[j]] = [p[j], p[i]]; setD({ priority: p }); };
  const tiers = d.multiEvent.tiers;
  const setTier = (i, patch) => setPart('multiEvent', { tiers: tiers.map((t, k) => (k === i ? { ...t, ...patch } : t)) });

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        fullDayPackages: s.fullDayPackages, eventSlotHours: Number(s.eventSlotHours),
        discounts: {
          enabled: d.enabled, stacking: d.stacking, priority: d.priority, maxPercent: Number(d.maxPercent),
          fullDay: { enabled: d.fullDay.enabled, percent: Number(d.fullDay.percent) },
          multiEvent: { enabled: d.multiEvent.enabled, tiers: tiers.map((t) => ({ minEvents: Number(t.minEvents), percent: Number(t.percent) })) },
          multiDay: { enabled: d.multiDay.enabled, minDays: Number(d.multiDay.minDays), percent: Number(d.multiDay.percent) },
          repeat: { enabled: d.repeat.enabled, minPriorBookings: Number(d.repeat.minPriorBookings), percent: Number(d.repeat.percent) },
        },
      };
      const r = await adminApi.updatePlatformSettings(body);
      onSaved(r.settings); toast.success('Discount rules saved. New quotes use them straight away.');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 font-sans lg:grid-cols-2">
      <Card title="Full-day packages">
        <div className="grid gap-4">
          <Toggle checked={s.fullDayPackages} onChange={(v) => setS((x) => ({ ...x, fullDayPackages: v }))}>Couples can book an entire wedding day as a package</Toggle>
          <Toggle checked={d.fullDay.enabled} onChange={(v) => setPart('fullDay', { enabled: v })}>Full-day discount</Toggle>
          <Num label="Full-day discount" value={d.fullDay.percent} onChange={(v) => setPart('fullDay', { percent: v })} hint="Applies when every event of the day (2 or more) is booked with one vendor. Vendors with their own full-day price use that instead." />
          <Num label="Time an event holds a vendor" value={s.eventSlotHours} onChange={(v) => setS((x) => ({ ...x, eventSlotHours: v }))} min={1} max={24} suffix="hours" hint="From the event's start time. Two bookings for one vendor can't overlap; events without a time hold the whole day." />
        </div>
      </Card>

      <Card title="Several events on one day">
        <div className="grid gap-3">
          <Toggle checked={d.multiEvent.enabled} onChange={(v) => setPart('multiEvent', { enabled: v })}>Multi-event discount (individual events, not a full day)</Toggle>
          <p className="text-xs text-muted">Only the highest tier reached applies, per day and vendor.</p>
          {tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Num label="From events" value={t.minEvents} onChange={(v) => setTier(i, { minEvents: v })} min={2} max={20} suffix="events" />
              <Num label="Discount" value={t.percent} onChange={(v) => setTier(i, { percent: v })} />
              <button type="button" onClick={() => setPart('multiEvent', { tiers: tiers.filter((_, k) => k !== i) })} className="mb-1 rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove tier"><Trash2 size={16} /></button>
            </div>
          ))}
          {tiers.length < 6 && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPart('multiEvent', { tiers: [...tiers, { minEvents: (Number(tiers.at(-1)?.minEvents) || 1) + 1, percent: 5 }] })} className="justify-self-start">Add tier</Button>}
        </div>
      </Card>

      <Card title="Several wedding days">
        <div className="grid gap-4">
          <Toggle checked={d.multiDay.enabled} onChange={(v) => setPart('multiDay', { enabled: v })}>Multi-day discount</Toggle>
          <div className="flex flex-wrap gap-4">
            <Num label="From" value={d.multiDay.minDays} onChange={(v) => setPart('multiDay', { minDays: v })} min={2} max={10} suffix="days" />
            <Num label="Discount" value={d.multiDay.percent} onChange={(v) => setPart('multiDay', { percent: v })} />
          </div>
          <p className="text-xs text-muted">Counts every wedding day in one checkout, including days with different vendors.</p>
        </div>
      </Card>

      <Card title="Returning couples">
        <div className="grid gap-4">
          <Toggle checked={d.repeat.enabled} onChange={(v) => setPart('repeat', { enabled: v })}>Repeat-booking discount</Toggle>
          <div className="flex flex-wrap gap-4">
            <Num label="After" value={d.repeat.minPriorBookings} onChange={(v) => setPart('repeat', { minPriorBookings: v })} min={1} max={20} suffix="confirmed bookings" />
            <Num label="Discount" value={d.repeat.percent} onChange={(v) => setPart('repeat', { percent: v })} />
          </div>
          <p className="text-xs text-muted">Counted by the server from the couple's confirmed and completed bookings. Pending, cancelled and declined bookings never count.</p>
        </div>
      </Card>

      <Card title="Combining discounts" className="lg:col-span-2">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid content-start gap-3">
            <Toggle checked={d.enabled} onChange={(v) => setD({ enabled: v })}>Discounts switched on</Toggle>
            <Num label="Maximum combined discount" value={d.maxPercent} onChange={(v) => setD({ maxPercent: v })} hint="Of the booking value. Discounts that would go past it are reduced, lowest priority first." />
          </div>
          <div>
            <span className="kn-label">Stacking</span>
            <div className="grid gap-2">
              {[['stack', 'Add eligible discounts together (up to the maximum)'], ['best', 'Only the single largest discount applies']].map(([v, label]) => (
                <label key={v} className="flex items-start gap-2 text-sm text-ink"><input type="radio" name="stacking" className="mt-1 accent-[#6E1E2A]" checked={d.stacking === v} onChange={() => setD({ stacking: v })} />{label}</label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">A full-day discount and a multi-event discount never apply to the same day. Every percentage is taken from the same booking value, never from an already discounted amount.</p>
          </div>
          <div>
            <span className="kn-label">Priority (granted first)</span>
            <ol className="grid gap-1.5">
              {d.priority.map((t, i) => (
                <li key={t} className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-ink/10">
                  <span className="w-5 text-muted">{i + 1}.</span><span className="flex-1 text-ink">{DISCOUNT_LABEL[t]}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:text-maroon disabled:opacity-30" aria-label={`Move ${DISCOUNT_LABEL[t]} up`}><ArrowUp size={14} /></button>
                  <button type="button" disabled={i === d.priority.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:text-maroon disabled:opacity-30" aria-label={`Move ${DISCOUNT_LABEL[t]} down`}><ArrowDown size={14} /></button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <Button icon={Save} loading={busy} onClick={save}>Save discount rules</Button>
        <p className="flex items-center gap-1.5 text-xs text-muted"><Info size={13} />{s.discountsUpdatedAt ? `Last changed ${fmtDate(s.discountsUpdatedAt)}. ` : ''}Requested and confirmed bookings keep their saved prices.</p>
      </div>
    </div>
  );
}
