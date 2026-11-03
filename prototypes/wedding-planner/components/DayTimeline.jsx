/**
 * Wedding-day timeline prototype: a vertical time grid with one column per venue space, the problems found
 * in the schedule, a control to move an item (its dependents follow), the vendor call sheet, and free slots.
 */
import { useMemo, useState } from 'react';
import { buildSchedule, findIssues, shiftItem, callSheet, freeWindows, hourMarks } from '../lib/timeline.js';
import { clock, duration, cx } from '../lib/format.js';
import { Panel, Tag } from './ui.jsx';

const PX_PER_MIN = 1.1;
const KIND_STYLE = {
  prep: 'border-gold/60 bg-gold/10', ritual: 'border-maroon/50 bg-maroon/10', celebration: 'border-rose bg-rose/20',
  meal: 'border-emerald-300 bg-emerald-50', logistics: 'border-ink/20 bg-ink/5',
};

export default function DayTimeline({ items: initial, locations, travel, vendors, muhurat, soundCurfew }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState(initial[0]?.id || '');
  const [lastShift, setLastShift] = useState(null);
  const [gapSpace, setGapSpace] = useState(Object.keys(locations)[0]);

  const schedule = useMemo(() => buildSchedule(items), [items]);
  const issues = useMemo(() => findIssues(schedule, { travel, muhurat, soundCurfew }), [schedule, travel, muhurat, soundCurfew]);
  const sheet = useMemo(() => callSheet(schedule, vendors), [schedule, vendors]);
  const marks = hourMarks(schedule);
  const top0 = marks[0] ?? 0;
  const gridHeight = ((marks.at(-1) ?? top0) - top0) * PX_PER_MIN;
  const flagged = new Set(issues.filter((i) => i.severity === 'error').flatMap((i) => i.items));
  const spaces = Object.keys(locations).filter((k) => schedule.some((s) => s.location === k));
  const gaps = freeWindows(schedule, gapSpace, '12:00', '23:59', 30);

  const shift = (delta) => {
    const r = shiftItem(items, selected, delta);
    setItems(r.items);
    setLastShift({ delta, ...r });
  };
  const titleOf = (id) => schedule.find((s) => s.id === id)?.title || id;

  return (
    <div className="space-y-6">
      <Panel title="Wedding day" action={<Tag tone={issues.some((i) => i.severity === 'error') ? 'bad' : issues.length ? 'warn' : 'good'}>{issues.length ? `${issues.length} to check` : 'No problems found'}</Tag>}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-ink-2">
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Move an item</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm">
              {schedule.map((s) => <option key={s.id} value={s.id}>{clock(s.startMin)} {s.title}{s.fixed ? ' (fixed)' : ''}</option>)}
            </select>
          </label>
          {[-15, 15, 30].map((d) => (
            <button key={d} type="button" onClick={() => shift(d)} className="rounded-full border border-ink/20 px-3 py-2 text-sm hover:border-maroon hover:text-maroon">
              {d > 0 ? `+${d}` : d} min
            </button>
          ))}
          <button type="button" onClick={() => { setItems(initial); setLastShift(null); }} className="rounded-full px-3 py-2 text-sm text-muted hover:text-maroon">Reset</button>
        </div>

        {lastShift && (
          <p className="mb-4 rounded-lg bg-cream px-3 py-2 text-sm text-ink-2" aria-live="polite">
            {lastShift.moved.length
              ? `Moved ${lastShift.moved.map((m) => `${titleOf(m.id)} to ${clock(m.to)}`).join(', ')}.`
              : 'Nothing moved.'}
            {lastShift.blocked.length > 0 && ` ${lastShift.blocked.map(titleOf).join(', ')} is fixed and kept its time. Check the order below.`}
          </p>
        )}

        <div className="overflow-x-auto">
          <div className="relative grid min-w-[720px]" style={{ gridTemplateColumns: `64px repeat(${spaces.length}, minmax(120px, 1fr))` }}>
            <div />
            {spaces.map((k) => <div key={k} className="border-b border-ink/10 px-2 pb-2 text-xs font-medium text-ink-2">{locations[k]}</div>)}

            <div className="relative" style={{ height: gridHeight }}>
              {marks.map((m) => <span key={m} className="absolute right-2 -translate-y-1/2 text-xs text-muted" style={{ top: (m - top0) * PX_PER_MIN }}>{clock(m)}</span>)}
            </div>
            {spaces.map((k) => (
              <div key={k} className="relative border-l border-ink/10" style={{ height: gridHeight }}>
                {marks.map((m) => <div key={m} className="absolute inset-x-0 border-t border-dashed border-ink/10" style={{ top: (m - top0) * PX_PER_MIN }} />)}
                {schedule.filter((s) => s.location === k).map((s) => (
                  <button key={s.id} type="button" onClick={() => setSelected(s.id)}
                    className={cx('absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs', KIND_STYLE[s.kind], flagged.has(s.id) && 'ring-2 ring-red-500', selected === s.id && 'outline outline-2 outline-maroon')}
                    style={{ top: (s.startMin - top0) * PX_PER_MIN, height: Math.max(22, s.durationMin * PX_PER_MIN) }}
                    aria-label={`${s.title}, ${clock(s.startMin)} to ${clock(s.endMin)}`}>
                    <span className="block font-medium text-ink">{s.title}</span>
                    <span className="text-muted">{clock(s.startMin)} to {clock(s.endMin)}{s.fixed ? ' · fixed' : ''}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Things to check">
          {issues.length ? (
            <ul className="space-y-2">
              {issues.map((i, n) => (
                <li key={n} className="flex items-start gap-2 text-sm">
                  <Tag tone={i.severity === 'error' ? 'bad' : 'warn'}>{i.type.replace('_', ' ')}</Tag>
                  <span className="text-ink-2">{i.message}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Everything is in order: no clashes, the muhurat is covered and music ends before the curfew.</p>}
        </Panel>

        <Panel title="Vendor call sheet">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="pb-2">Vendor</th><th>Arrive</th><th>First item</th><th>Leave</th><th>On site</th></tr></thead>
            <tbody>
              {sheet.map((v) => (
                <tr key={v.owner} className="border-t border-ink/10">
                  <td className="py-2 text-ink">{v.name}</td><td>{clock(v.arrive)}</td><td className="text-ink-2">{v.firstItem}</td><td>{clock(v.leave)}</td><td className="text-muted">{duration(v.onSiteMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Free time in a space" action={
        <select value={gapSpace} onChange={(e) => setGapSpace(e.target.value)} aria-label="Space" className="rounded-lg border border-ink/20 bg-white px-3 py-1.5 text-sm">
          {Object.entries(locations).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      }>
        {gaps.length
          ? <div className="flex flex-wrap gap-2">{gaps.map((g) => <Tag key={g.start} tone="good">{clock(g.start)} to {clock(g.end)} ({duration(g.end - g.start)})</Tag>)}</div>
          : <p className="text-sm text-muted">No free half-hour between noon and midnight.</p>}
      </Panel>
    </div>
  );
}
