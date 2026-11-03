/**
 * Reception seating. A household always sits together at one table. Pure functions only.
 *
 * Hard rules (a placement that breaks one is not allowed):
 *   - a table never has more people than seats
 *   - a household that needs a wheelchair sits at an accessible table
 *   - households listed in each other's `apart` never share a table
 * Soft preferences (scored, higher is better):
 *   - closer family sits nearer the stage
 *   - households of the same side and group sit together
 *   - 'quiet' households stay out of the stage zone, next to the speakers
 *   - seniors are not sent to the far garden tables
 */

const ZONE_RANK = { stage: 0, centre: 1, rear: 2, garden: 3 };
export const size = (h) => h.adults + h.seniors + h.children;
const needs = (h, n) => (h.needs || []).includes(n);
const apart = (a, b) => (a.apart || []).includes(b.id) || (b.apart || []).includes(a.id);

/** Empty plan: { tables: { T1: [] ... }, unseated: [] } holding household ids. */
export const emptyPlan = (tables) => ({ tables: Object.fromEntries(tables.map((t) => [t.id, []])), unseated: [] });

const seated = (plan, tableId, byId) => plan.tables[tableId].reduce((n, id) => n + size(byId[id]), 0);

/** Why a household cannot sit at a table, or null when it can. */
export function blockReason(plan, table, h, byId) {
  const others = plan.tables[table.id].filter((id) => id !== h.id).map((id) => byId[id]);
  const used = others.reduce((n, o) => n + size(o), 0);
  if (used + size(h) > table.seats) return `${table.name} has ${table.seats - used} free seats; ${h.name} needs ${size(h)}`;
  if (needs(h, 'wheelchair') && !table.accessible) return `${table.name} has no step-free access`;
  const clash = others.find((o) => apart(h, o));
  if (clash) return `${h.name} and ${clash.name} should not share a table`;
  return null;
}

/** How well a household fits a table, given who is already there. */
export function fitScore(plan, table, h, byId) {
  const others = plan.tables[table.id].filter((id) => id !== h.id).map((id) => byId[id]);
  const zone = ZONE_RANK[table.zone] ?? 2;
  let score = 0;
  score += (3 - zone) * h.closeness * 4;                                            // the closest family get the front tables
  score += others.filter((o) => o.side === h.side).length * 3;                     // same side
  score += others.filter((o) => o.side === h.side && o.group === h.group).length * 5; // same side and circle
  score -= others.filter((o) => o.side !== h.side && o.group !== h.group).length * 2; // strangers to each other
  if (needs(h, 'quiet') && table.zone === 'stage') score -= 15;
  if (h.seniors && table.zone === 'garden') score -= 6 * h.seniors;
  if (h.children && others.some((o) => o.children)) score += 2;                    // children sit with other children
  return score;
}

/** Total score of a plan: the sum of every seated household's fit. */
export function planScore(plan, tables, byId) {
  return tables.reduce((s, t) => s + plan.tables[t.id].reduce((x, id) => x + fitScore(plan, t, byId[id], byId), 0), 0);
}

/**
 * Seats everyone it can. The hardest households go first (wheelchair users, then large groups, then the
 * closest family), each at the allowed table where it fits best. Then `improve` tries moves and swaps.
 */
export function autoSeat(households, tables, { passes = 6 } = {}) {
  const byId = Object.fromEntries(households.map((h) => [h.id, h]));
  const plan = emptyPlan(tables);
  const order = [...households].sort((a, b) =>
    Number(needs(b, 'wheelchair')) - Number(needs(a, 'wheelchair')) || size(b) - size(a) || b.closeness - a.closeness || a.id.localeCompare(b.id));
  for (const h of order) {
    const options = tables.filter((t) => !blockReason(plan, t, h, byId)).map((t) => ({ t, s: fitScore(plan, t, h, byId) }));
    if (!options.length) { plan.unseated.push(h.id); continue; }
    options.sort((a, b) => b.s - a.s || a.t.id.localeCompare(b.t.id, undefined, { numeric: true }));
    plan.tables[options[0].t.id].push(h.id);
  }
  return improve(plan, households, tables, { passes });
}

/**
 * Local search, always deterministic: move one household to another table, or swap two households, whenever
 * that raises the plan score without breaking a hard rule. Stops after a pass with no improvement.
 */
export function improve(plan, households, tables, { passes = 6 } = {}) {
  const byId = Object.fromEntries(households.map((h) => [h.id, h]));
  const tById = Object.fromEntries(tables.map((t) => [t.id, t]));
  let cur = clonePlan(plan); let best = planScore(cur, tables, byId);
  for (let p = 0; p < passes; p++) {
    let changed = false;
    for (const a of tables) {
      for (const hid of [...cur.tables[a.id]]) {
        if (!cur.tables[a.id].includes(hid)) continue; // swapped away earlier in this pass
        for (const b of tables) {
          if (b.id === a.id) continue;
          // move hid from a to b
          const mv = clonePlan(cur); mv.tables[a.id] = mv.tables[a.id].filter((x) => x !== hid); mv.tables[b.id].push(hid);
          if (!blockReason(mv, b, byId[hid], byId)) {
            const s = planScore(mv, tables, byId);
            if (s > best) { cur = mv; best = s; changed = true; break; }
          }
          // swap hid with each household at b
          for (const other of cur.tables[b.id]) {
            const sw = clonePlan(cur);
            sw.tables[a.id] = sw.tables[a.id].map((x) => (x === hid ? other : x));
            sw.tables[b.id] = sw.tables[b.id].map((x) => (x === other ? hid : x));
            if (blockReason(sw, tById[b.id], byId[hid], byId) || blockReason(sw, a, byId[other], byId)) continue;
            const s = planScore(sw, tables, byId);
            if (s > best) { cur = sw; best = s; changed = true; break; }
          }
          if (!cur.tables[a.id].includes(hid)) break; // hid has moved; continue with the next household
        }
      }
    }
    // households that could not be seated earlier may fit now
    for (const hid of [...cur.unseated]) {
      const t = tables.find((x) => !blockReason(cur, x, byId[hid], byId));
      if (t) { cur.tables[t.id].push(hid); cur.unseated = cur.unseated.filter((x) => x !== hid); changed = true; }
    }
    if (!changed) break;
  }
  return cur;
}

/** Manual change from the planner: move a household to a table (or 'unseated'). Returns { plan, error }. */
export function moveHousehold(plan, households, tables, hid, toTableId) {
  const byId = Object.fromEntries(households.map((h) => [h.id, h]));
  const next = clonePlan(plan);
  for (const id of Object.keys(next.tables)) next.tables[id] = next.tables[id].filter((x) => x !== hid);
  next.unseated = next.unseated.filter((x) => x !== hid);
  if (toTableId === 'unseated') { next.unseated.push(hid); return { plan: next, error: null }; }
  const table = tables.find((t) => t.id === toTableId);
  if (!table) return { plan, error: `Unknown table ${toTableId}` };
  const why = blockReason(next, table, byId[hid], byId);
  if (why) return { plan, error: why };
  next.tables[toTableId].push(hid);
  return { plan: next, error: null };
}

/** Per-table summary for display, plus totals and any household left without a seat. */
export function seatingReport(plan, households, tables) {
  const byId = Object.fromEntries(households.map((h) => [h.id, h]));
  const rows = tables.map((t) => {
    const hs = plan.tables[t.id].map((id) => byId[id]);
    const people = hs.reduce((n, h) => n + size(h), 0);
    const sides = { bride: 0, groom: 0 };
    for (const h of hs) sides[h.side] += size(h);
    return {
      table: t, households: hs, people, free: t.seats - people, fill: Math.round((people / t.seats) * 100), sides,
      children: hs.reduce((n, h) => n + h.children, 0), seniors: hs.reduce((n, h) => n + h.seniors, 0),
      mixed: sides.bride > 0 && sides.groom > 0,
    };
  });
  const guests = households.reduce((n, h) => n + size(h), 0);
  const seats = tables.reduce((n, t) => n + t.seats, 0);
  const seatedPeople = rows.reduce((n, r) => n + r.people, 0);
  return { rows, guests, seats, seated: seatedPeople, unseated: plan.unseated.map((id) => byId[id]), score: planScore(plan, tables, byId) };
}

/** Checks a whole plan against the hard rules, e.g. after loading a saved one. Returns a list of messages. */
export function validatePlan(plan, households, tables) {
  const byId = Object.fromEntries(households.map((h) => [h.id, h]));
  const problems = []; const seen = new Set();
  for (const t of tables) {
    for (const hid of plan.tables[t.id] || []) {
      if (!byId[hid]) { problems.push(`${t.name}: unknown household ${hid}`); continue; }
      if (seen.has(hid)) problems.push(`${byId[hid].name} is seated twice`);
      seen.add(hid);
    }
    if (seated(plan, t.id, byId) > t.seats) problems.push(`${t.name} is over capacity`);
    const hs = (plan.tables[t.id] || []).map((id) => byId[id]).filter(Boolean);
    for (const h of hs) {
      if (needs(h, 'wheelchair') && !t.accessible) problems.push(`${h.name} needs step-free access at ${t.name}`);
      const clash = hs.find((o) => o !== h && apart(h, o));
      if (clash && h.id < clash.id) problems.push(`${h.name} and ${clash.name} share ${t.name}`);
    }
  }
  const missing = households.filter((h) => !seen.has(h.id) && !plan.unseated.includes(h.id));
  for (const h of missing) problems.push(`${h.name} is missing from the plan`);
  return problems;
}

const clonePlan = (p) => ({ tables: Object.fromEntries(Object.entries(p.tables).map(([k, v]) => [k, [...v]])), unseated: [...p.unseated] });
