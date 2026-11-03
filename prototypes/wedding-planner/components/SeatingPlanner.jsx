/**
 * Reception seating prototype. Seats every household automatically, then lets the couple move a household
 * to another table; a move that breaks a hard rule (capacity, step-free access, households kept apart) is
 * refused with the reason. Each table shows how full it is and how many guests come from each side.
 */
import { useMemo, useState } from 'react';
import { autoSeat, moveHousehold, seatingReport, validatePlan, size } from '../lib/seating.js';
import { cx } from '../lib/format.js';
import { Panel, Stat, Tag, Bar } from './ui.jsx';

const ZONE_LABEL = { stage: 'By the stage', centre: 'Centre', rear: 'Rear', garden: 'Garden' };
const SIDE_LABEL = { bride: "Bride's side", groom: "Groom's side" };

export default function SeatingPlanner({ households, tables }) {
  const initial = useMemo(() => autoSeat(households, tables), [households, tables]);
  const [plan, setPlan] = useState(initial);
  const [picked, setPicked] = useState(null);   // household id being moved
  const [message, setMessage] = useState(null); // { tone, text }
  const [side, setSide] = useState('all');

  const report = useMemo(() => seatingReport(plan, households, tables), [plan, households, tables]);
  const problems = useMemo(() => validatePlan(plan, households, tables), [plan, households, tables]);
  const byId = useMemo(() => Object.fromEntries(households.map((h) => [h.id, h])), [households]);

  const moveTo = (tableId) => {
    if (!picked) return;
    const r = moveHousehold(plan, households, tables, picked, tableId);
    if (r.error) setMessage({ tone: 'bad', text: r.error });
    else {
      setPlan(r.plan);
      const t = tables.find((x) => x.id === tableId);
      setMessage({ tone: 'good', text: `${byId[picked].name} moved to ${t ? t.name : 'the unseated list'}` });
    }
    setPicked(null);
  };
  const visible = (h) => side === 'all' || h.side === side;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Guests" value={report.guests} hint={`${households.length} households`} />
        <Stat label="Seats" value={report.seats} hint={`${report.seats - report.guests} spare`} tone={report.seats < report.guests ? 'bad' : undefined} />
        <Stat label="Seated" value={report.seated} hint={report.unseated.length ? `${report.unseated.length} households waiting` : 'Everyone has a seat'} tone={report.unseated.length ? 'bad' : undefined} />
        <Stat label="Plan score" value={report.score} hint="Higher keeps families and friends together" />
      </div>

      <Panel title="Tables" action={
        <div className="flex items-center gap-2">
          <select value={side} onChange={(e) => setSide(e.target.value)} aria-label="Show side" className="rounded-lg border border-ink/20 bg-white px-3 py-1.5 text-sm">
            <option value="all">Both sides</option><option value="bride">{SIDE_LABEL.bride}</option><option value="groom">{SIDE_LABEL.groom}</option>
          </select>
          <button type="button" onClick={() => { setPlan(autoSeat(households, tables)); setMessage({ tone: 'good', text: 'Seating recalculated from scratch' }); }}
            className="rounded-full bg-maroon px-4 py-1.5 text-sm text-ivory hover:bg-maroon-dk">Auto-seat again</button>
        </div>
      }>
        {picked && (
          <p className="mb-4 rounded-lg bg-maroon/10 px-3 py-2 text-sm text-maroon" aria-live="polite">
            Moving <b>{byId[picked].name}</b> ({size(byId[picked])} people). Choose a table, or <button type="button" className="underline" onClick={() => setPicked(null)}>cancel</button>.
          </p>
        )}
        {message && !picked && <p className={cx('mb-4 rounded-lg px-3 py-2 text-sm', message.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')} aria-live="polite">{message.text}</p>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {report.rows.map((r) => (
            <article key={r.table.id} className={cx('rounded-xl border p-4', picked ? 'cursor-pointer border-maroon/40 hover:bg-maroon/5' : 'border-ink/10')}
              onClick={() => picked && moveTo(r.table.id)} onKeyDown={(e) => picked && (e.key === 'Enter' || e.key === ' ') && moveTo(r.table.id)}
              tabIndex={picked ? 0 : -1} aria-label={picked ? `Move to ${r.table.name}` : undefined}>
              <header className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-display text-lg text-ink">{r.table.name} <span className="text-sm text-muted">{r.table.id}</span></h4>
                  <p className="text-xs text-muted">{ZONE_LABEL[r.table.zone]}{r.table.accessible ? ' · step-free' : ''}</p>
                </div>
                <Tag tone={r.free < 0 ? 'bad' : r.free === 0 ? 'gold' : 'neutral'}>{r.people}/{r.table.seats}</Tag>
              </header>
              <Bar value={r.people} max={r.table.seats} tone={r.free < 0 ? 'bad' : 'brand'} label={`${r.table.name} seats used`} />
              <p className="mt-2 text-xs text-muted">
                {r.sides.bride ? `${r.sides.bride} bride's side` : ''}{r.sides.bride && r.sides.groom ? ' · ' : ''}{r.sides.groom ? `${r.sides.groom} groom's side` : ''}
                {r.children ? ` · ${r.children} children` : ''}{r.seniors ? ` · ${r.seniors} seniors` : ''}
              </p>
              <ul className="mt-3 space-y-1.5">
                {r.households.filter(visible).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink-2">{h.name} <span className="text-muted">({size(h)})</span>
                      {(h.needs || []).includes('wheelchair') && <span className="ml-1 text-xs text-maroon">step-free</span>}
                    </span>
                    {!picked && <button type="button" onClick={(e) => { e.stopPropagation(); setPicked(h.id); setMessage(null); }} className="text-xs text-maroon hover:underline">Move</button>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Waiting for a seat" action={picked && <button type="button" onClick={() => moveTo('unseated')} className="text-sm text-maroon hover:underline">Put here</button>}>
          {report.unseated.length ? (
            <ul className="space-y-1.5">
              {report.unseated.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-2">{h.name} ({size(h)}, {SIDE_LABEL[h.side]})</span>
                  <button type="button" onClick={() => { setPicked(h.id); setMessage(null); }} className="text-xs text-maroon hover:underline">Seat</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Every household has a table.</p>}
        </Panel>
        <Panel title="Rule check">
          {problems.length
            ? <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            : <p className="text-sm text-muted">No table is over capacity, every step-free need is met, and no households that should be apart share a table.</p>}
        </Panel>
      </div>
    </div>
  );
}
