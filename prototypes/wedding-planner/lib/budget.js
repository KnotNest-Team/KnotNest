/**
 * Budget breakdown. Each line is { id, category, item, planned, quoted, committed, paid, due: [{ date, amount }] }.
 * Pure functions; dates are "YYYY-MM-DD"; `today` is always passed in so results are reproducible.
 */
import { daysBetween, monthKey } from './format.js';

/**
 * The best current estimate of what a line will cost: the signed contract if there is one, otherwise the
 * vendor's quote, otherwise the plan. Money already paid is never less than the forecast.
 */
export function forecast(line) {
  const base = line.committed > 0 ? line.committed : line.quoted > 0 ? line.quoted : line.planned;
  return Math.max(base, line.paid);
}
export const stage = (line) => (line.committed > 0 ? (line.paid >= line.committed ? 'paid' : 'contracted') : line.quoted > 0 ? 'quoted' : 'estimate');

/** Totals per category and for the whole wedding, with variance = forecast - planned (positive = over). */
export function summarize(lines) {
  const cats = new Map();
  for (const l of lines) {
    const c = cats.get(l.category) || { category: l.category, planned: 0, forecast: 0, committed: 0, paid: 0, lines: [] };
    c.planned += l.planned; c.forecast += forecast(l); c.committed += l.committed; c.paid += l.paid;
    c.lines.push({ ...l, forecast: forecast(l), stage: stage(l), owed: Math.max(0, l.committed - l.paid) });
    cats.set(l.category, c);
  }
  const categories = [...cats.values()]
    .map((c) => ({ ...c, variance: c.forecast - c.planned, owed: Math.max(0, c.committed - c.paid) }))
    .sort((a, b) => b.forecast - a.forecast);
  const total = categories.reduce((t, c) => ({
    planned: t.planned + c.planned, forecast: t.forecast + c.forecast, committed: t.committed + c.committed, paid: t.paid + c.paid,
  }), { planned: 0, forecast: 0, committed: 0, paid: 0 });
  total.variance = total.forecast - total.planned;
  total.owed = Math.max(0, total.committed - total.paid);
  return { categories, total };
}

/**
 * Where the money stands against the couple's overall budget, keeping `contingencyPercent` aside for surprises.
 * `headroom` is what is left to spend after the forecast and the contingency.
 */
export function position(lines, budget, contingencyPercent = 0) {
  const { total } = summarize(lines);
  const contingency = Math.round((budget * contingencyPercent) / 100);
  return { budget, contingency, forecast: total.forecast, paid: total.paid, owed: total.owed, headroom: budget - contingency - total.forecast, spendable: budget - contingency };
}

/**
 * Instalments still due, oldest first, each marked overdue / soon (within `soonDays`) / later.
 * Instalments are assumed unpaid; payments already made are counted in `paid` instead.
 */
export function upcomingPayments(lines, today, soonDays = 30) {
  return lines.flatMap((l) => (l.due || []).map((d) => {
    const inDays = daysBetween(today, d.date);
    return { lineId: l.id, category: l.category, item: l.item, date: d.date, amount: d.amount, inDays, status: inDays < 0 ? 'overdue' : inDays <= soonDays ? 'soon' : 'later' };
  })).sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}

/**
 * Money still to pay, by month. Contracted amounts with no instalment dates are put in the wedding month,
 * since that is when vendors expect the balance. Returns [{ month: 'YYYY-MM', amount, items }] in date order.
 */
export function cashflow(lines, weddingDate) {
  const months = new Map();
  const add = (key, amount, item) => {
    const m = months.get(key) || { month: key, amount: 0, items: [] };
    m.amount += amount; m.items.push(item); months.set(key, m);
  };
  for (const l of lines) {
    const scheduled = (l.due || []).reduce((s, d) => s + d.amount, 0);
    for (const d of l.due || []) add(monthKey(d.date), d.amount, l.item);
    const unscheduled = Math.max(0, l.committed - l.paid - scheduled);
    if (unscheduled) add(monthKey(weddingDate), unscheduled, `${l.item} (balance, no date set)`);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Lines that do not add up: instalments that are more or less than what is owed, or payments above the contract. */
export function inconsistencies(lines) {
  const out = [];
  for (const l of lines) {
    const scheduled = (l.due || []).reduce((s, d) => s + d.amount, 0);
    const owed = l.committed - l.paid;
    if (l.committed > 0 && l.paid > l.committed) out.push({ lineId: l.id, message: `${l.item}: paid ${l.paid} is more than the contract of ${l.committed}` });
    else if (l.committed > 0 && scheduled > owed) out.push({ lineId: l.id, message: `${l.item}: instalments add up to ${scheduled}, but only ${owed} is still owed` });
    if (!l.committed && scheduled) out.push({ lineId: l.id, message: `${l.item}: instalments are set but no contract is signed` });
  }
  return out;
}

/**
 * Suggests moving money from categories expected to finish under plan to those running over.
 * Only the unspent, uncommitted part of a category can be offered: a category never gives away money it
 * has already signed for. Largest overrun is covered first, from the category with the most to spare.
 * Returns { moves: [{ from, to, amount }], uncovered: [{ category, amount }] }.
 */
export function rebalance(lines) {
  const { categories } = summarize(lines);
  const spare = categories
    .map((c) => ({ category: c.category, left: Math.max(0, Math.min(c.planned - c.forecast, c.planned - c.committed)) }))
    .filter((c) => c.left > 0)
    .sort((a, b) => b.left - a.left);
  const over = categories.filter((c) => c.variance > 0).map((c) => ({ category: c.category, need: c.variance })).sort((a, b) => b.need - a.need);
  const moves = []; const uncovered = [];
  for (const o of over) {
    for (const s of spare) {
      if (!o.need) break;
      if (!s.left) continue;
      const amount = Math.min(o.need, s.left);
      moves.push({ from: s.category, to: o.category, amount });
      o.need -= amount; s.left -= amount;
    }
    if (o.need) uncovered.push({ category: o.category, amount: o.need });
  }
  return { moves, uncovered };
}

/** Cost per guest, overall and for the categories that scale with guests. */
export function perGuest(lines, guests, perHeadCategories = ['Catering', 'Gifts', 'Invitations']) {
  if (!guests) return { overall: 0, perHead: 0 };
  const { categories, total } = summarize(lines);
  const perHead = categories.filter((c) => perHeadCategories.includes(c.category)).reduce((s, c) => s + c.forecast, 0);
  return { overall: Math.round(total.forecast / guests), perHead: Math.round(perHead / guests) };
}
