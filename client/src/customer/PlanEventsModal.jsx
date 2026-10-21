import { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2, Info } from 'lucide-react';
import { weddingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Loader, ErrorState } from '../components/States';
import { errMsg, toInputDate } from '../utils/format';

const SIDE = { both: 'Both families', bride: "Bride's side", groom: "Groom's side" };
let uid = 0;

/**
 * Shows the suggested events for the couple's tradition(s). Everything is editable before saving:
 * tick or untick, rename, change date/time/side, and add their own events. Events already in the plan
 * are shown but never changed.
 */
export default function PlanEventsModal({ open, onClose, onApplied, traditionLabel }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(null); setError('');
    weddingApi.plan({}).then((d) => setRows(d.events.map((e) => ({ ...e, id: ++uid, date: toInputDate(e.date) })))).catch((e) => setError(errMsg(e)));
  }, [open]);

  const set = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addCustom = () => setRows((rs) => [...rs, { id: ++uid, custom: true, selected: true, name: '', date: rs.find((r) => r.main)?.date || '', time: '', hostSide: 'both', meaning: '' }]);
  const chosen = (rows || []).filter((r) => r.selected && !r.exists);
  const save = async () => {
    const bad = chosen.find((r) => r.name.trim().length < 2 || !r.date);
    if (bad) return toast.error(bad.name ? `Add a date for "${bad.name}"` : 'Give your new event a name and date');
    setSaving(true);
    try {
      const res = await weddingApi.applyPlan(chosen.map(({ templateKey, name, date, time, hostSide, meaning, tradition }) => ({ templateKey: templateKey || '', name: name.trim(), date, time, hostSide, meaning, tradition })));
      toast.success(res.added ? `${res.added} ${res.added === 1 ? 'event' : 'events'} added. Guests on your list were invited to them.` : 'Those events are already in your plan');
      onApplied(res); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title={`Plan your ${traditionLabel || ''} events`.replace('  ', ' ')}
      subtitle="Suggested from your tradition and wedding date. Untick, rename, change any date or time, or add your own."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Sparkles} loading={saving} disabled={!chosen.length} onClick={save}>{chosen.length ? `Add ${chosen.length} ${chosen.length === 1 ? 'event' : 'events'}` : 'Nothing selected'}</Button></>}>
      {error ? <ErrorState message={error} /> : !rows ? <Loader /> : (
        <div className="grid gap-3">
          <p className="flex items-start gap-2 rounded-xl bg-gold/10 px-3 py-2.5 text-sm text-[#6d4c22]"><Info size={16} className="mt-0.5 shrink-0" /><span>Customs differ between regions, communities and families, so treat these as a starting point. Events already in your plan stay exactly as you edited them.</span></p>
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={r.id} className={`rounded-xl border p-3 transition ${r.exists ? 'border-ink/5 bg-ink/[0.03] opacity-70' : r.selected ? 'border-maroon/30 bg-white' : 'border-ink/10 bg-white/60'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-2.5 h-4 w-4 shrink-0 accent-[#6E1E2A]" checked={r.exists || r.selected} disabled={r.exists}
                    onChange={(e) => set(r.id, { selected: e.target.checked })} aria-label={`Include ${r.name || 'this event'}`} />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_150px_minmax(0,1fr)_140px]">
                    <input className="kn-input !py-2 font-medium" value={r.name} disabled={r.exists} placeholder="Event name, e.g. Pool party" onChange={(e) => set(r.id, { name: e.target.value, selected: true })} aria-label="Event name" />
                    <input type="date" className="kn-input !py-2" value={r.date} disabled={r.exists} onChange={(e) => set(r.id, { date: e.target.value, selected: true })} aria-label="Date" />
                    <input className="kn-input !py-2" value={r.time} disabled={r.exists} placeholder="Time" onChange={(e) => set(r.id, { time: e.target.value })} aria-label="Time" />
                    <select className="kn-input !py-2" value={r.hostSide} disabled={r.exists} onChange={(e) => set(r.id, { hostSide: e.target.value })} aria-label="Hosted by">
                      {Object.entries(SIDE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {r.custom && <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="mt-1.5 rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove this event"><Trash2 size={16} /></button>}
                </div>
                <div className="ml-7 mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  {r.exists && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-600/20">Already in your plan</span>}
                  {r.main && <span className="rounded-full bg-maroon/10 px-2 py-0.5 text-maroon">Main ceremony</span>}
                  {r.optional && !r.exists && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink-2">Optional</span>}
                  {r.past && !r.exists && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">Date has passed</span>}
                  {r.tradition && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[#6d4c22]">{r.tradition}</span>}
                  {r.custom && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink-2">Your own event</span>}
                  {r.meaning && <span className="text-muted">{r.meaning}</span>}
                </div>
              </li>
            ))}
          </ul>
          <Button variant="secondary" icon={Plus} className="justify-self-start" onClick={addCustom}>Add your own event</Button>
        </div>
      )}
    </Modal>
  );
}
