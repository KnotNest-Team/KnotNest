/**
 * KnotNest discount engine (pure functions, no database).
 *
 * The server is the only place prices are decided: controllers resolve the couple's selection into priced
 * days (vendor prices read from the database), then call priceBooking() here. The React app shows the
 * result of POST /api/bookings/quote, which runs this same code, so screen and server never disagree.
 *
 * Rules (all percentages come from the admin's discount settings):
 *   1. Every event is charged once at its individual price            -> subtotal
 *   2. A vendor's own full-day package price replaces the day's sum    -> packageSavings (a price, not a discount)
 *   3. Percentage discounts are calculated on the eligible subtotal (after step 2), never on an already
 *      discounted amount:
 *        full_day     per day, every eligible event of the day booked as a package (2+ events)
 *        multi_event  per day, 2+ individual events with the same vendor (highest matching tier only)
 *        multi_day    the checkout covers services on N+ different wedding days
 *        repeat       the couple already has confirmed or completed bookings (counted by the server)
 *      full_day and multi_event never apply to the same day.
 *   4. stacking "best" keeps only the largest discount type; "stack" keeps all of them.
 *   5. The total is capped at maxPercent of the eligible subtotal. Discounts are granted in priority order;
 *      the ones that would pass the cap are trimmed (and shown as trimmed).
 */

export const LABELS = { full_day: 'Full-day package', multi_event: 'Multiple events on one day', multi_day: 'Multiple wedding days', repeat: 'Returning couple' };
const r = (n) => Math.round(Number(n) || 0);
const pct = (base, p) => r((base * p) / 100);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const dayLabel = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Highest multi-event tier the count reaches, or null. */
export function multiEventTier(rules, count) {
  return [...(rules.multiEvent?.tiers || [])].sort((a, b) => b.minEvents - a.minEvents).find((t) => count >= t.minEvents) || null;
}

/**
 * days: [{ date: 'YYYY-MM-DD', mode: 'date'|'full_day'|'events', events: [{ name, price }], subtotal, packagePrice }]
 * ctx:  { rules (Setting.discounts), priorBookings, checkoutDays (distinct wedding days in the whole checkout) }
 * Returns { days, pricing, bookingType } with every amount in whole rupees.
 */
export function priceBooking(days, { rules, priorBookings = 0, checkoutDays } = {}) {
  const on = rules?.enabled !== false;
  const out = days.map((d) => {
    const subtotal = d.mode === 'date' ? r(d.subtotal) : r(d.events.reduce((t, e) => t + r(e.price), 0));
    const pkg = d.mode === 'full_day' && d.packagePrice != null && d.packagePrice > 0 && d.packagePrice < subtotal ? r(d.packagePrice) : null;
    return { ...d, subtotal, packagePrice: pkg, amount: pkg ?? subtotal };
  });
  const subtotal = out.reduce((t, d) => t + d.subtotal, 0);
  const eligible = out.reduce((t, d) => t + d.amount, 0);
  const nDays = checkoutDays ?? new Set(out.map((d) => d.date)).size;

  // ---- candidates ----
  const cands = [];
  if (on) {
    for (const d of out) {
      const n = d.events?.length || 0;
      if (d.mode === 'full_day' && rules.fullDay?.enabled && !d.packagePrice && n >= 2 && rules.fullDay.percent > 0)
        cands.push({ type: 'full_day', day: d.date, percent: rules.fullDay.percent, base: d.amount, reason: `All ${n} events on ${dayLabel(d.date)} booked as one package` });
      if (d.mode === 'events' && rules.multiEvent?.enabled) {
        const tier = multiEventTier(rules, n);
        if (tier && tier.percent > 0) cands.push({ type: 'multi_event', day: d.date, percent: tier.percent, base: d.amount, reason: `${plural(n, 'event')} on ${dayLabel(d.date)} with this vendor (${tier.minEvents}+ events tier)` });
      }
    }
    if (rules.multiDay?.enabled && rules.multiDay.percent > 0 && nDays >= rules.multiDay.minDays)
      cands.push({ type: 'multi_day', day: '', percent: rules.multiDay.percent, base: eligible, reason: `Services booked on ${plural(nDays, 'wedding day')} (${rules.multiDay.minDays}+ days)` });
    if (rules.repeat?.enabled && rules.repeat.percent > 0 && priorBookings >= rules.repeat.minPriorBookings)
      cands.push({ type: 'repeat', day: '', percent: rules.repeat.percent, base: eligible, reason: `You already have ${plural(priorBookings, 'confirmed booking')} with KnotNest` });
  }
  for (const c of cands) c.amount = pct(c.base, c.percent);

  // ---- stacking ----
  let chosen = cands;
  if (rules?.stacking === 'best' && cands.length) {
    const byType = {};
    for (const c of cands) byType[c.type] = (byType[c.type] || 0) + c.amount;
    const best = Object.entries(byType).sort((a, b) => b[1] - a[1])[0][0];
    chosen = cands.filter((c) => c.type === best);
  }
  const order = rules?.priority || ['full_day', 'multi_event', 'multi_day', 'repeat'];
  chosen = [...chosen].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.day.localeCompare(b.day));

  // ---- cap ----
  const maxPercent = rules?.maxPercent ?? 100;
  const cap = pct(eligible, maxPercent);
  let left = cap; let capped = false;
  const discounts = chosen.map((c) => {
    const amount = Math.min(c.amount, Math.max(0, left));
    left -= amount;
    const trimmed = amount < c.amount;
    if (trimmed) capped = true;
    return {
      type: c.type, label: LABELS[c.type], percent: c.percent, amount, day: c.day, trimmed,
      reason: trimmed ? `${c.reason}. ${amount ? `Reduced from ₹${c.amount.toLocaleString('en-IN')}` : 'Not applied'}: total discount is limited to ${maxPercent}%` : c.reason,
    };
  });
  const totalDiscount = discounts.reduce((t, d) => t + d.amount, 0);

  // ---- day-level discounts per day (booking-wide ones stay at booking level) ----
  for (const d of out) d.discount = discounts.filter((x) => x.day === d.date).reduce((t, x) => t + x.amount, 0);

  const nEvents = out.reduce((t, d) => t + (d.events?.length || 0), 0);
  const bookingType = out.length > 1 ? 'multi_day' : out[0]?.mode === 'full_day' ? 'full_day' : nEvents > 1 ? 'multi_event' : 'single_event';
  return {
    days: out,
    bookingType,
    pricing: {
      version: 2, subtotal, packageSavings: subtotal - eligible, eligibleSubtotal: eligible, discounts, totalDiscount, capped,
      maxPercent, stacking: rules?.stacking || 'stack', final: eligible - totalDiscount, priorBookings,
    },
  };
}

/** Event-name matching used for vendor event prices and the events a vendor offers. */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function matchesName(eventName, label) {
  const a = norm(eventName); const b = norm(label);
  if (!a || !b) return false;
  return a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);
}
export const offersEvent = (vendor, eventName) => !vendor.eventsOffered?.length || vendor.eventsOffered.some((x) => matchesName(eventName, x));
/** Vendor's price for one event: chosen package > exact event price > partial name match > starting price. */
export function eventPrice(vendor, eventName, packageName) {
  if (packageName) {
    const p = (vendor.packages || []).find((x) => x.name === packageName);
    if (p) return p.price;
  }
  const list = vendor.eventPricing || [];
  const exact = list.find((x) => norm(x.eventName) === norm(eventName));
  const near = exact || list.find((x) => matchesName(eventName, x.eventName));
  return near ? near.price : vendor.startingPrice || 0;
}
