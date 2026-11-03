/**
 * Vendor comparison. Vendors price in different ways (flat, per plate, per hour, per event), so each one is
 * first turned into a full quote for the couple's actual need, then scored on the same scale. Pure functions.
 */

export const GST_PERCENT = 18;
const CANCELLATION_SCORE = { flexible: 1, moderate: 0.6, strict: 0.2 };
// Ratings with few reviews are pulled towards a typical marketplace rating (a Bayesian average).
const PRIOR_RATING = 4.3; const PRIOR_REVIEWS = 25;

export const DEFAULT_WEIGHTS = { price: 0.4, rating: 0.3, coverage: 0.2, flexibility: 0.05, response: 0.05 };

/**
 * The vendor's full price for `need` ({ guests?, hours?, events? }), as labelled lines:
 * base price (with minimums applied), travel, then GST when the price does not include it.
 */
export function quote(vendor, need = {}) {
  const p = vendor.pricing; const lines = [];
  switch (p.model) {
    case 'flat': lines.push({ label: 'Package price', amount: p.amount }); break;
    case 'per_plate': {
      const plates = Math.max(need.guests || 0, p.minimum || 0);
      lines.push({ label: `${plates} plates x ${p.amount}${plates > (need.guests || 0) ? ` (minimum ${p.minimum})` : ''}`, amount: plates * p.amount });
      break;
    }
    case 'per_hour': {
      const hours = Math.max(need.hours || 0, p.minimum || 0);
      lines.push({ label: `${hours} h x ${p.amount}${hours > (need.hours || 0) ? ` (minimum ${p.minimum} h)` : ''}`, amount: hours * p.amount });
      break;
    }
    case 'per_event': {
      const events = Math.max(need.events || 1, 1);
      lines.push({ label: `${events} events x ${p.amount}`, amount: events * p.amount });
      break;
    }
    default: throw new Error(`Unknown pricing model "${p.model}" for ${vendor.name}`);
  }
  if (vendor.travelFee) lines.push({ label: 'Travel and stay', amount: vendor.travelFee });
  const beforeTax = lines.reduce((s, l) => s + l.amount, 0);
  if (!vendor.gstIncluded) lines.push({ label: `GST ${GST_PERCENT}%`, amount: Math.round((beforeTax * GST_PERCENT) / 100) });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, advance: Math.round((total * (vendor.advancePercent || 0)) / 100) };
}

/** Rating adjusted for how many reviews back it: 4.9 from 9 reviews counts for less than 4.7 from 200. */
export const adjustedRating = (rating, reviews) => (rating * reviews + PRIOR_RATING * PRIOR_REVIEWS) / (reviews + PRIOR_REVIEWS);

/** Share of the required services the vendor includes (1 = all of them), and which ones are missing. */
export function coverage(vendor, required = []) {
  if (!required.length) return { share: 1, missing: [] };
  const missing = required.filter((r) => !vendor.includes.includes(r));
  return { share: (required.length - missing.length) / required.length, missing };
}

/**
 * Compares the vendors of one category for the wedding date. Each result has the quote, the raw metrics,
 * metrics scaled 0..1 within this shortlist (1 = best), a weighted score, and flags:
 *   available   free on the date (busy vendors are still shown, ranked last)
 *   dominated   another available vendor is at least as good on price, rating and coverage, and better on one
 */
export function compareVendors(vendors, need, { date, weights = DEFAULT_WEIGHTS } = {}) {
  const rows = vendors.map((v) => {
    const q = quote(v, need); const cov = coverage(v, need.required);
    return {
      vendor: v, quote: q, available: !date || !(v.busy || []).includes(date), missing: cov.missing,
      metrics: { price: q.total, rating: adjustedRating(v.rating, v.reviews), coverage: cov.share, flexibility: CANCELLATION_SCORE[v.cancellation] ?? 0.5, response: v.responseHours },
    };
  });
  // lower is better for price and response time; higher for the others
  const scale = (key, lowerIsBetter) => {
    const vals = rows.map((r) => r.metrics[key]); const min = Math.min(...vals); const max = Math.max(...vals);
    for (const r of rows) r.scaled = { ...r.scaled, [key]: max === min ? 1 : lowerIsBetter ? (max - r.metrics[key]) / (max - min) : (r.metrics[key] - min) / (max - min) };
  };
  scale('price', true); scale('rating', false); scale('coverage', false); scale('flexibility', false); scale('response', true);

  const wsum = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
  for (const r of rows) r.score = Math.round((Object.entries(weights).reduce((s, [k, w]) => s + w * (r.scaled[k] ?? 0), 0) / wsum) * 100);

  const pool = rows.filter((r) => r.available);
  for (const r of rows) {
    r.dominated = r.available && pool.some((o) => o !== r
      && o.metrics.price <= r.metrics.price && o.metrics.rating >= r.metrics.rating && o.metrics.coverage >= r.metrics.coverage
      && (o.metrics.price < r.metrics.price || o.metrics.rating > r.metrics.rating || o.metrics.coverage > r.metrics.coverage));
  }
  rows.sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || a.metrics.price - b.metrics.price);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

/** A short, plain-language reason for each available vendor's position, for the comparison table. */
export function explain(rows) {
  const avail = rows.filter((r) => r.available);
  if (!avail.length) return {};
  const cheapest = avail.reduce((a, b) => (b.metrics.price < a.metrics.price ? b : a));
  const topRated = avail.reduce((a, b) => (b.metrics.rating > a.metrics.rating ? b : a));
  const out = {};
  for (const r of rows) {
    const notes = [];
    if (!r.available) notes.push('Already booked on your date');
    if (r === cheapest) notes.push('Lowest total price');
    if (r === topRated) notes.push('Best rating, allowing for review count');
    if (r.missing.length) notes.push(`Missing: ${r.missing.map(labelOf).join(', ')}`);
    if (r.dominated) notes.push('Another vendor is cheaper or better on every count');
    if (r.vendor.reviews < 15) notes.push(`Only ${r.vendor.reviews} reviews so far`);
    out[r.vendor.id] = notes;
  }
  return out;
}

/** How much more (or less) than the cheapest available quote, as rupees and %. */
export function priceGap(rows) {
  const avail = rows.filter((r) => r.available);
  if (!avail.length) return {};
  const min = Math.min(...avail.map((r) => r.metrics.price));
  return Object.fromEntries(rows.map((r) => [r.vendor.id, { amount: r.metrics.price - min, percent: Math.round(((r.metrics.price - min) / min) * 100) }]));
}

export const labelOf = (key) => key.replace(/_/g, ' ');
