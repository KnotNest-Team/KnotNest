/**
 * Wedding-day timeline: builds the schedule, finds problems, and moves items without breaking the order.
 * Pure functions only. Items are { id, title, start 'HH:MM', durationMin, location, owner, kind, fixed?, after?, music? }.
 */
import { toMin, clock } from './format.js';

/** Items with numeric start/end (minutes after midnight), sorted by start then by title. */
export function buildSchedule(items) {
  return items
    .map((it) => { const start = toMin(it.start); return { ...it, startMin: start, endMin: start + it.durationMin }; })
    .sort((a, b) => a.startMin - b.startMin || a.title.localeCompare(b.title));
}

const overlaps = (a, b) => a.startMin < b.endMin && b.startMin < a.endMin;
/** Walking time between two venue spaces; unknown pairs fall back to `fallback` minutes. */
export const travelBetween = (matrix, from, to, fallback = 10) => (from === to ? 0 : matrix[`${from}|${to}`] ?? matrix[`${to}|${from}`] ?? fallback);

/**
 * Problems in a schedule, each { type, severity: 'error'|'warning', items: [ids], message }:
 *   owner_clash    one vendor or the family is booked for two things at once
 *   space_clash    two items share a space at the same time (getting-ready items may share)
 *   order          an item starts before something it depends on has finished
 *   travel         the same owner has too little time to walk to the next space
 *   muhurat        the fixed ritual does not cover the muhurat
 *   curfew         amplified music runs past the venue's sound curfew
 */
export function findIssues(schedule, { travel = {}, muhurat, muhuratItem = 'pheras', soundCurfew } = {}) {
  const issues = [];
  const byId = Object.fromEntries(schedule.map((s) => [s.id, s]));
  const add = (type, severity, ids, message) => issues.push({ type, severity, items: ids, message });

  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      const a = schedule[i]; const b = schedule[j];
      if (b.startMin >= a.endMin) continue;
      if (a.owner === b.owner && a.owner !== 'family') add('owner_clash', 'error', [a.id, b.id], `${a.title} and ${b.title} both need ${a.owner} from ${clock(b.startMin)}`);
      if (a.location === b.location && !(a.kind === 'prep' && b.kind === 'prep')) add('space_clash', 'error', [a.id, b.id], `${a.title} and ${b.title} overlap in the same space`);
    }
  }

  for (const s of schedule) {
    for (const dep of s.after || []) {
      const d = byId[dep];
      if (!d) { add('order', 'error', [s.id], `${s.title} depends on "${dep}", which is not on the schedule`); continue; }
      if (s.startMin < d.endMin) add('order', 'error', [d.id, s.id], `${s.title} starts at ${clock(s.startMin)}, before ${d.title} ends at ${clock(d.endMin)}`);
    }
  }

  // consecutive items for the same owner in different spaces need walking time between them
  const byOwner = groupBy(schedule, (s) => s.owner);
  for (const list of Object.values(byOwner)) {
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]; const next = list[i];
      const need = travelBetween(travel, prev.location, next.location);
      const gap = next.startMin - prev.endMin;
      if (gap >= 0 && gap < need) add('travel', 'warning', [prev.id, next.id], `${need} min walk from ${prev.title} to ${next.title}, but only ${gap} min between them`);
    }
  }

  if (muhurat) {
    const m = toMin(muhurat); const r = byId[muhuratItem];
    if (!r) add('muhurat', 'error', [], `No "${muhuratItem}" item to hold the muhurat at ${clock(m)}`);
    else if (!(r.startMin <= m && m < r.endMin)) add('muhurat', 'error', [r.id], `${r.title} runs ${clock(r.startMin)} to ${clock(r.endMin)} and misses the muhurat at ${clock(m)}`);
  }

  if (soundCurfew) {
    const c = toMin(soundCurfew);
    for (const s of schedule) if (s.music && s.endMin > c) add('curfew', 'warning', [s.id], `${s.title} runs to ${clock(s.endMin)}, past the ${clock(c)} sound curfew`);
  }
  return issues;
}

/**
 * Moves one item by `delta` minutes and pushes everything that depends on it (directly or not) by just
 * enough to keep the order. Fixed items never move: a push that would need to move one is reported in
 * `blocked`, and that item keeps its time. Returns { items, moved: [{ id, from, to }], blocked: [ids] }.
 */
export function shiftItem(items, id, delta) {
  const sched = Object.fromEntries(buildSchedule(items).map((s) => [s.id, { ...s }]));
  const target = sched[id];
  if (!target) throw new Error(`Unknown item "${id}"`);
  if (target.fixed) return { items, moved: [], blocked: [id] };
  const dependents = (x) => Object.values(sched).filter((s) => (s.after || []).includes(x));
  const moved = new Map(); const blocked = new Set();
  const move = (s, to) => { if (!moved.has(s.id)) moved.set(s.id, s.startMin); s.startMin = to; s.endMin = to + s.durationMin; };

  move(target, Math.max(0, target.startMin + delta));
  // breadth-first over dependents; an item is only ever pushed later, never pulled earlier
  const queue = [target];
  while (queue.length) {
    const cur = queue.shift();
    for (const d of dependents(cur.id)) {
      const earliest = Math.max(...d.after.map((a) => sched[a]?.endMin ?? 0));
      if (d.startMin >= earliest) continue;
      if (d.fixed) { blocked.add(d.id); continue; }
      move(d, earliest);
      queue.push(d);
    }
  }
  const out = items.map((it) => (moved.has(it.id) ? { ...it, start: hhmm(sched[it.id].startMin) } : it));
  return { items: out, moved: [...moved].map(([mid, from]) => ({ id: mid, from, to: sched[mid].startMin })), blocked: [...blocked] };
}
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * One line per owner for the day's call sheet: arrive `setupMin` before their first item, leave after their
 * last. The family is left out (they are there all day).
 */
export function callSheet(schedule, vendors) {
  return Object.entries(groupBy(schedule, (s) => s.owner))
    .filter(([owner]) => owner !== 'family')
    .map(([owner, list]) => {
      const v = vendors[owner] || { name: owner, setupMin: 0 };
      const first = list[0]; const last = list.reduce((a, b) => (b.endMin > a.endMin ? b : a));
      return { owner, name: v.name, arrive: Math.max(0, first.startMin - v.setupMin), firstItem: first.title, leave: last.endMin, items: list.length, onSiteMin: last.endMin - Math.max(0, first.startMin - v.setupMin) };
    })
    .sort((a, b) => a.arrive - b.arrive);
}

/** Free gaps of at least `minGap` minutes in a space between `from` and `to` (HH:MM), e.g. to fit a new item. */
export function freeWindows(schedule, location, from, to, minGap = 30) {
  const start = toMin(from); const end = toMin(to);
  const busy = schedule.filter((s) => s.location === location).map((s) => [s.startMin, s.endMin]).sort((a, b) => a[0] - b[0]);
  const out = []; let cursor = start;
  for (const [s, e] of busy) {
    if (s - cursor >= minGap) out.push({ start: cursor, end: Math.min(s, end) });
    cursor = Math.max(cursor, e);
    if (cursor >= end) break;
  }
  if (end - cursor >= minGap) out.push({ start: cursor, end });
  return out;
}

/** Hour rows for drawing the timeline grid, from the earliest start to the latest end, rounded to whole hours. */
export function hourMarks(schedule) {
  if (!schedule.length) return [];
  const first = Math.floor(Math.min(...schedule.map((s) => s.startMin)) / 60);
  const last = Math.ceil(Math.max(...schedule.map((s) => s.endMin)) / 60);
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * 60);
}

function groupBy(list, key) {
  const out = {};
  for (const x of list) (out[key(x)] ||= []).push(x);
  return out;
}
