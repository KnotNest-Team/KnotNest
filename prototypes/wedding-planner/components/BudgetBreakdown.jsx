/**
 * Budget breakdown prototype: where the money stands against the couple's budget, each category's forecast
 * against its plan, the instalments coming up, cash needed per month, and where spare money could cover overruns.
 */
import { useMemo, useState } from 'react';
import { summarize, position, upcomingPayments, cashflow, rebalance, inconsistencies, perGuest } from '../lib/budget.js';
import { inr, inrShort, pct, shortDate, monthLabel, cx } from '../lib/format.js';
import { Panel, Stat, Tag, Bar } from './ui.jsx';

const STAGE_TONE = { paid: 'good', contracted: 'brand', quoted: 'gold', estimate: 'neutral' };
const STATUS_TONE = { overdue: 'bad', soon: 'warn', later: 'neutral' };

export default function BudgetBreakdown({ lines, budget, contingencyPercent, today, weddingDate, guests }) {
  const [open, setOpen] = useState(null); // expanded category
  const [soonDays, setSoonDays] = useState(30);

  const { categories, total } = useMemo(() => summarize(lines), [lines]);
  const pos = useMemo(() => position(lines, budget, contingencyPercent), [lines, budget, contingencyPercent]);
  const payments = useMemo(() => upcomingPayments(lines, today, soonDays), [lines, today, soonDays]);
  const months = useMemo(() => cashflow(lines, weddingDate), [lines, weddingDate]);
  const plan = useMemo(() => rebalance(lines), [lines]);
  const warnings = useMemo(() => inconsistencies(lines), [lines]);
  const heads = perGuest(lines, guests);
  const maxCat = Math.max(...categories.map((c) => Math.max(c.forecast, c.planned)), 1);
  const maxMonth = Math.max(...months.map((m) => m.amount), 1);
  const dueSoon = payments.filter((p) => p.status !== 'later').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Budget" value={inrShort(pos.budget)} hint={`${inrShort(pos.contingency)} kept aside (${contingencyPercent}%)`} />
        <Stat label="Expected total" value={inrShort(pos.forecast)} hint={`${pct(pos.forecast, pos.spendable)}% of what can be spent`} tone={pos.headroom < 0 ? 'bad' : undefined} />
        <Stat label="Paid so far" value={inrShort(pos.paid)} hint={`${inrShort(pos.owed)} still owed on contracts`} />
        <Stat label={pos.headroom < 0 ? 'Over budget' : 'Left to plan'} value={inrShort(Math.abs(pos.headroom))} hint={`${inr(heads.overall)} per guest overall`} tone={pos.headroom < 0 ? 'bad' : undefined} />
      </div>

      <Panel title="By category" action={<span className="text-xs text-muted">Bar = expected cost · line = planned</span>}>
        <ul className="divide-y divide-ink/10">
          {categories.map((c) => (
            <li key={c.category} className="py-3">
              <button type="button" onClick={() => setOpen(open === c.category ? null : c.category)} aria-expanded={open === c.category} className="w-full text-left">
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-ink">{c.category}</span>
                  <span className="text-sm">
                    <span className="text-ink">{inr(c.forecast)}</span>
                    <span className="text-muted"> of {inr(c.planned)}</span>
                    {c.variance !== 0 && <span className={cx('ml-2', c.variance > 0 ? 'text-red-700' : 'text-emerald-700')}>{c.variance > 0 ? '+' : '-'}{inrShort(Math.abs(c.variance))}</span>}
                  </span>
                </div>
                <Bar value={c.forecast} max={maxCat} marker={c.planned} tone={c.variance > 0 ? 'bad' : 'brand'} label={`${c.category} expected cost`} />
              </button>
              {open === c.category && (
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="pb-1">Item</th><th>Stage</th><th className="text-right">Planned</th><th className="text-right">Expected</th><th className="text-right">Paid</th></tr></thead>
                  <tbody>
                    {c.lines.map((l) => (
                      <tr key={l.id} className="border-t border-ink/10">
                        <td className="py-1.5 text-ink-2">{l.item}</td>
                        <td><Tag tone={STAGE_TONE[l.stage]}>{l.stage}</Tag></td>
                        <td className="text-right text-muted">{inr(l.planned)}</td>
                        <td className={cx('text-right', l.forecast > l.planned && 'text-red-700')}>{inr(l.forecast)}</td>
                        <td className="text-right">{inr(l.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-ink/10 pt-3 text-sm text-ink-2">
          Total {inr(total.forecast)} expected against {inr(total.planned)} planned
          {total.variance ? <span className={total.variance > 0 ? 'text-red-700' : 'text-emerald-700'}> ({total.variance > 0 ? 'over' : 'under'} by {inr(Math.abs(total.variance))})</span> : null}.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Payments coming up" action={
          <select value={soonDays} onChange={(e) => setSoonDays(Number(e.target.value))} aria-label="Due within" className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-sm">
            {[14, 30, 60, 90].map((d) => <option key={d} value={d}>Next {d} days</option>)}
          </select>
        }>
          <p className="mb-3 text-sm text-muted">{inr(dueSoon)} due in the next {soonDays} days (as of {shortDate(today)}).</p>
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={`${p.lineId}-${p.date}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><Tag tone={STATUS_TONE[p.status]}>{shortDate(p.date)}</Tag><span className="text-ink-2">{p.item}</span></span>
                <span className="text-ink">{inr(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Cash needed by month">
          <ul className="space-y-3">
            {months.map((m) => (
              <li key={m.month}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-ink-2">{monthLabel(m.month)}</span><span className="text-ink">{inr(m.amount)}</span></div>
                <Bar value={m.amount} max={maxMonth} tone="gold" label={`${monthLabel(m.month)} payments`} />
                <p className="mt-1 text-xs text-muted">{m.items.join(', ')}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Covering overruns">
          {plan.moves.length ? (
            <ul className="space-y-2 text-sm">
              {plan.moves.map((m) => <li key={`${m.from}-${m.to}`} className="text-ink-2">Move <b className="text-ink">{inr(m.amount)}</b> from {m.from} to {m.to}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">No category is running over its plan.</p>}
          {plan.uncovered.length > 0 && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Not enough spare in other categories for {plan.uncovered.map((u) => `${u.category} (${inr(u.amount)})`).join(', ')}. This would come from the contingency of {inr(pos.contingency)}.
            </p>
          )}
          <p className="mt-3 text-xs text-muted">Only money that is neither spent nor signed for is offered. Guest-related costs come to {inr(heads.perHead)} per guest.</p>
        </Panel>
        <Panel title="Figures to double-check">
          {warnings.length
            ? <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">{warnings.map((w) => <li key={w.lineId + w.message}>{w.message}</li>)}</ul>
            : <p className="text-sm text-muted">Every instalment plan matches what is still owed on its contract.</p>}
        </Panel>
      </div>
    </div>
  );
}
