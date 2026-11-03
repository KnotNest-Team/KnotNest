/**
 * Pricing regression tests: `node server/tests/pricing.regression.test.js` (no server or database needed).
 *
 * Complements pricing.unit.test.js. That file covers the headline rules; this one pins the edges that are easy
 * to break when the engine is touched: exact thresholds, partial cap trimming, rounding, package-price edge
 * cases, mixed day modes, per-day discount allocation, and how bookingService turns a couple's selection into
 * priced days (resolveDays) and auto-upgrades to a full-day package (priceDays).
 *
 * Every expected amount is worked out by hand in the comment next to it, from DEFAULT_DISCOUNTS:
 *   full_day 15% | multi_event 2+ = 5%, 3+ = 10% | multi_day 2+ days = 10% | repeat 1+ prior = 5% | cap 20% | stack
 */
import assert from 'assert/strict';
import { priceBooking } from '../services/pricingEngine.js';
import { resolveDays, priceDays, eventsByDay } from '../services/bookingService.js';
import { DEFAULT_DISCOUNTS, withDefaults } from '../models/Setting.js';

let pass = 0; const fails = [];
const t = (name, fn) => { try { fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fails.push(name); console.log(`  FAIL ${name}\n       ${e.message}`); } };
const rules = (patch = {}) => ({ ...JSON.parse(JSON.stringify(DEFAULT_DISCOUNTS)), ...patch });
const ev = (name, price) => ({ name, price });
const types = (p) => [...new Set(p.discounts.filter((d) => d.amount > 0).map((d) => d.type))].sort().join(',');
const D1 = '2030-03-01'; const D2 = '2030-03-02'; const D3 = '2030-03-03';
const one = (date, price = 10000, name = 'Event') => ({ date, mode: 'events', events: [ev(name, price)] });
const day1 = [ev('Haldi', 15000), ev('Mehendi', 20000), ev('Sangeet', 30000)]; // 65,000
const day2 = [ev('Wedding', 50000), ev('Reception', 40000)];                  // 90,000

console.log('Thresholds');
t('multi-day: below minDays gives nothing, reaching it gives the discount', () => {
  const r = rules(); r.multiDay.minDays = 3;
  assert.equal(priceBooking([one(D1), one(D2)], { rules: r }).pricing.totalDiscount, 0);
  // 3 days x 10,000 = 30,000; 10% = 3,000
  const p = priceBooking([one(D1), one(D2), one(D3)], { rules: r }).pricing;
  assert.equal(p.totalDiscount, 3000); assert.equal(types(p), 'multi_day');
});
t('repeat: below minPriorBookings gives nothing, reaching it gives the discount', () => {
  const r = rules(); r.repeat.minPriorBookings = 2;
  assert.equal(priceBooking([one(D1)], { rules: r, priorBookings: 1 }).pricing.totalDiscount, 0);
  assert.equal(priceBooking([one(D1)], { rules: r, priorBookings: 2 }).pricing.totalDiscount, 500); // 5% of 10,000
});
t('multi-event: a 0% tier counts as no discount', () => {
  const r = rules(); r.multiEvent.tiers = [{ minEvents: 2, percent: 0 }, { minEvents: 3, percent: 10 }];
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: day1.slice(0, 2) }], { rules: r }).pricing.totalDiscount, 0);
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: day1 }], { rules: r }).pricing.totalDiscount, 6500);
});
t('multi-event: tiers stored out of order still pick the highest tier reached', () => {
  const r = rules(); r.multiEvent.tiers = [{ minEvents: 3, percent: 10 }, { minEvents: 2, percent: 5 }];
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: day1 }], { rules: r }).pricing.discounts[0].percent, 10);
});
t('a discount type with 0% is never offered', () => {
  const r = rules(); r.fullDay.percent = 0; r.multiDay.percent = 0;
  const p = priceBooking([{ date: D1, mode: 'full_day', events: day1 }, { date: D2, mode: 'full_day', events: day2 }], { rules: r }).pricing;
  assert.equal(p.discounts.length, 0); assert.equal(p.final, 155000);
});

console.log('Cap');
t('total exactly at the cap is not marked as capped', () => {
  // 65,000: full_day 15% = 9,750 + repeat 5% = 3,250 -> 13,000 = exactly 20%
  const p = priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules(), priorBookings: 1 }).pricing;
  assert.equal(p.totalDiscount, 13000); assert.equal(p.final, 52000); assert.equal(p.capped, false);
  assert.ok(p.discounts.every((d) => !d.trimmed));
});
t('the cap can trim a discount part-way and says by how much', () => {
  // cap 18% of 65,000 = 11,700: full_day 9,750 in full, repeat 3,250 trimmed to 1,950
  const p = priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules({ maxPercent: 18 }), priorBookings: 1 }).pricing;
  const repeat = p.discounts.find((d) => d.type === 'repeat');
  assert.equal(repeat.amount, 1950); assert.ok(repeat.trimmed); assert.ok(p.capped);
  assert.match(repeat.reason, /Reduced from ₹3,250/); assert.match(repeat.reason, /limited to 18%/);
  assert.equal(p.totalDiscount, 11700); assert.equal(p.final, 53300);
});
t('a 0% cap applies nothing but still lists the discounts as not applied', () => {
  const p = priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules({ maxPercent: 0 }) }).pricing;
  assert.equal(p.totalDiscount, 0); assert.equal(p.final, 65000); assert.ok(p.capped);
  assert.equal(p.discounts[0].amount, 0); assert.match(p.discounts[0].reason, /Not applied/);
});
t('same-type day discounts are granted in date order, the later day is trimmed', () => {
  const r = rules({ maxPercent: 3.75 }); r.multiDay.enabled = false;
  // two days x (10,000 + 10,000): multi_event 5% = 1,000 each; cap 3.75% of 40,000 = 1,500. Days sent in reverse order.
  const days = [D2, D1].map((date) => ({ date, mode: 'events', events: [ev('A', 10000), ev('B', 10000)] }));
  const p = priceBooking(days, { rules: r }).pricing;
  assert.deepEqual(p.discounts.map((d) => [d.day, d.amount]), [[D1, 1000], [D2, 500]]);
});

console.log('Rounding');
t('amounts are whole rupees: prices and percentages are rounded, never truncated', () => {
  // 3,333.4 -> 3,333 and 3,333.6 -> 3,334: subtotal 6,667; 5% = 333.35 -> 333
  const p = priceBooking([{ date: D1, mode: 'events', events: [ev('A', 3333.4), ev('B', 3333.6)] }], { rules: rules() }).pricing;
  assert.equal(p.subtotal, 6667); assert.equal(p.totalDiscount, 333); assert.equal(p.final, 6334);
});

console.log('Package prices');
t('a package price equal to the sum is ignored (the full-day % applies instead)', () => {
  const { pricing, days } = priceBooking([{ date: D1, mode: 'full_day', events: day1, packagePrice: 65000 }], { rules: rules() });
  assert.equal(days[0].packagePrice, null); assert.equal(pricing.packageSavings, 0); assert.equal(pricing.totalDiscount, 9750);
});
t('a zero or missing package price is ignored', () => {
  for (const packagePrice of [0, null, undefined]) {
    const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1, packagePrice }], { rules: rules() });
    assert.equal(pricing.packageSavings, 0, `packagePrice ${packagePrice}`); assert.equal(pricing.final, 55250);
  }
});
t('a package price only applies to full-day days, not to individually picked events', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'events', events: day1, packagePrice: 40000 }], { rules: rules() });
  assert.equal(pricing.packageSavings, 0); assert.equal(pricing.eligibleSubtotal, 65000); assert.equal(types(pricing), 'multi_event');
});
t('booking-wide discounts are calculated on the package price, not the list price', () => {
  // D1 package 52,000 (list 65,000) + D2 one event 50,000 = eligible 102,000; multi_day 10% = 10,200
  const { pricing, days } = priceBooking([{ date: D1, mode: 'full_day', events: day1, packagePrice: 52000 }, { date: D2, mode: 'events', events: [day2[0]] }], { rules: rules() });
  assert.equal(pricing.subtotal, 115000); assert.equal(pricing.packageSavings, 13000); assert.equal(pricing.eligibleSubtotal, 102000);
  assert.equal(types(pricing), 'multi_day'); assert.equal(pricing.totalDiscount, 10200); assert.equal(pricing.final, 91800);
  assert.deepEqual(days.map((d) => d.amount), [52000, 50000]);
});

console.log('Stacking and allocation');
t('a full-day day and an events day in one booking each get their own day discount', () => {
  // D1 full_day 65,000 -> 9,750; D2 2 events 90,000 -> 4,500; multi_day 10% of 155,000 = 15,500; total 29,750 < cap 31,000
  const { pricing, bookingType, days } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }, { date: D2, mode: 'events', events: day2 }], { rules: rules() });
  assert.equal(types(pricing), 'full_day,multi_day,multi_event'); assert.equal(pricing.totalDiscount, 29750); assert.equal(pricing.final, 125250);
  assert.equal(bookingType, 'multi_day'); assert.deepEqual(days.map((d) => d.discount), [9750, 4500]);
});
t('day discounts land on their day; booking-wide ones are not spread over days', () => {
  // D1 45,000 -> 2,250; D2 90,000 -> 4,500; multi_day 13,500 stays at booking level
  const { pricing, days } = priceBooking([{ date: D1, mode: 'events', events: [day1[0], day1[2]] }, { date: D2, mode: 'events', events: day2 }], { rules: rules() });
  assert.deepEqual(days.map((d) => d.discount), [2250, 4500]);
  const bookingWide = pricing.discounts.filter((d) => d.day === '').reduce((s, d) => s + d.amount, 0);
  assert.equal(bookingWide, 13500); assert.equal(days[0].discount + days[1].discount + bookingWide, pricing.totalDiscount);
});
t('"best" stacking compares the total per discount type, summed over days', () => {
  const r = rules({ stacking: 'best', maxPercent: 100 }); r.multiDay.enabled = false; r.repeat.percent = 4;
  // multi_event 1,000 + 1,000 = 2,000 beats repeat 4% of 40,000 = 1,600, although each single day (1,000) is smaller
  const days = [D1, D2].map((date) => ({ date, mode: 'events', events: [ev('A', 10000), ev('B', 10000)] }));
  const p = priceBooking(days, { rules: r, priorBookings: 1 }).pricing;
  assert.equal(types(p), 'multi_event'); assert.equal(p.totalDiscount, 2000); assert.equal(p.stacking, 'best');
});
t('"best" stacking can pick a booking-wide discount over day discounts', () => {
  // D1 2 events (multi_event 1,000), D2 1 event; multi_day 10% of 30,000 = 3,000 wins
  const p = priceBooking([{ date: D1, mode: 'events', events: [ev('A', 10000), ev('B', 10000)] }, one(D2)], { rules: rules({ stacking: 'best' }) }).pricing;
  assert.equal(types(p), 'multi_day'); assert.equal(p.totalDiscount, 3000);
});
t('booking type: several events on one day is multi_event; a whole-date day is single_event', () => {
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: day2 }], { rules: rules() }).bookingType, 'multi_event');
  assert.equal(priceBooking([{ date: D1, mode: 'date', events: [], subtotal: 50000 }], { rules: rules() }).bookingType, 'single_event');
});
t('settings defaults: a partial priority list is completed and unknown types are dropped; tiers are sorted', () => {
  const s = withDefaults({ discounts: { priority: ['repeat', 'bogus'], multiEvent: { tiers: [{ minEvents: 4, percent: 12 }, { minEvents: 2, percent: 3 }] } } });
  assert.deepEqual(s.discounts.priority, ['repeat', 'full_day', 'multi_event', 'multi_day']);
  assert.deepEqual(s.discounts.multiEvent.tiers.map((x) => x.minEvents), [2, 4]);
});

// ---------------------------------------------------------------------------------------------------------
// bookingService: the couple's selection -> priced days. Dates are relative to today because resolveDays
// rejects past dates.
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const A = inDays(200); const B = inDays(201);
const wedding = { events: [
  { _id: 'e1', name: 'Haldi', date: A, time: '10:00 AM' },
  { _id: 'e2', name: 'Mehendi', date: A, time: '2:00 PM' },
  { _id: 'e3', name: 'Sangeet', date: A, time: '7:00 PM onwards' },
  { _id: 'e4', name: 'Wedding', date: B, time: '9:00 PM' },
] };
const byDay = eventsByDay(wedding, 4);
const settings = withDefaults({});
const vend = (patch = {}) => ({
  businessName: 'Test Studio', startingPrice: 25000, packages: [{ name: 'Gold', price: 45000 }], eventsOffered: [], unavailableDates: [], fullDay: { enabled: true, price: 0 },
  eventPricing: [{ eventName: 'Haldi', price: 15000 }, { eventName: 'Mehendi', price: 20000 }, { eventName: 'Sangeet', price: 30000 }, { eventName: 'Wedding', price: 60000 }],
  ...patch,
});
const resolve = (v, raw, s = settings) => resolveDays(v, raw, { byDay, settings: s });
const fails400 = (fn, rx, status = 400) => assert.throws(fn, (e) => e.status === status && rx.test(e.message));

console.log('Selection to priced days (resolveDays)');
t('events are priced from the vendor listing, and the time slot comes from the wedding plan', () => {
  const [d] = resolve(vend(), [{ date: A, mode: 'events', events: ['e1', 'e3'] }]);
  assert.deepEqual(d.events.map((e) => [e.name, e.price, e.start, e.end]), [['Haldi', 15000, 600, 840], ['Sangeet', 30000, 1140, 1380]]);
  assert.equal(d.canUpgrade, false, 'two of three events picked');
});
t('full day takes only the events the vendor covers', () => {
  const [d] = resolve(vend({ eventsOffered: ['Haldi', 'Sangeet'] }), [{ date: A, mode: 'full_day' }]);
  assert.deepEqual(d.events.map((e) => e.name), ['Haldi', 'Sangeet']);
});
t('full day plus individual events on the same day is charged once, as the full day', () => {
  for (const raw of [[{ date: A, mode: 'full_day' }, { date: A, mode: 'events', events: ['e1'] }], [{ date: A, mode: 'events', events: ['e1'] }, { date: A, mode: 'full_day' }]]) {
    const days = resolve(vend(), raw);
    assert.equal(days.length, 1); assert.equal(days[0].mode, 'full_day'); assert.equal(days[0].events.length, 3);
  }
});
t('two event lists for the same day are merged and de-duplicated', () => {
  const days = resolve(vend(), [{ date: A, mode: 'events', events: ['e1'] }, { date: A, mode: 'events', events: ['e1', 'e2'] }]);
  assert.equal(days.length, 1); assert.deepEqual(days[0].events.map((e) => e.name), ['Haldi', 'Mehendi']);
});
t('the same whole date listed twice is rejected', () => {
  fails400(() => resolve(vend(), [{ date: B }, { date: B }]), /listed twice/);
});
t('the vendor full-day price is attached only to full-day days', () => {
  const v = vend({ fullDay: { enabled: true, price: 52000 } });
  const [full, evs] = resolve(v, [{ date: A, mode: 'full_day' }, { date: B, mode: 'events', events: ['e4'] }]);
  assert.equal(full.packagePrice, 52000); assert.equal(evs.packagePrice, null);
});
t('full day is refused when the marketplace or the vendor switched packages off', () => {
  fails400(() => resolve(vend(), [{ date: A, mode: 'full_day' }], { ...settings, fullDayPackages: false }), /does not offer full-day/);
  fails400(() => resolve(vend({ fullDay: { enabled: false, price: 0 } }), [{ date: A, mode: 'full_day' }]), /does not offer full-day/);
});
t('a chosen package prices every event of the day at the package price', () => {
  const [d] = resolve(vend(), [{ date: A, mode: 'events', events: ['e1', 'e2'], packageName: 'Gold' }]);
  assert.deepEqual(d.events.map((e) => e.price), [45000, 45000]);
  fails400(() => resolve(vend(), [{ date: A, mode: 'events', events: ['e1'], packageName: 'Platinum' }]), /package does not exist/);
});
t('a whole-date day is priced at the package, or the starting price', () => {
  assert.equal(resolve(vend(), [{ date: B, packageName: 'Gold' }])[0].subtotal, 45000);
  assert.equal(resolve(vend(), [{ date: B }])[0].subtotal, 25000);
});
t('selection errors: blocked date (409), past date, too many days, event on another day, uncovered event', () => {
  fails400(() => resolve(vend({ unavailableDates: [A] }), [{ date: A, mode: 'full_day' }]), /not available on/, 409);
  fails400(() => resolve(vend(), [{ date: inDays(-2) }]), /today or later/);
  fails400(() => resolve(vend(), Array.from({ length: 11 }, (_, i) => ({ date: inDays(300 + i) }))), /up to 10 days/);
  fails400(() => resolve(vend(), [{ date: B, mode: 'events', events: ['e1'] }]), /is now on/);
  fails400(() => resolve(vend({ eventsOffered: ['Wedding'] }), [{ date: A, mode: 'events', events: ['e1'] }]), /does not provide services for Haldi/);
});

console.log('Automatic full-day upgrade (priceDays)');
const ctx = { rules: settings.discounts, priorBookings: 0 };
t('every event of a day ticked one by one is priced as the cheaper full day', () => {
  // events: 65,000 - 10% = 58,500; full day: 65,000 - 15% = 55,250
  const v = vend(); const days = resolve(v, [{ date: A, mode: 'events', events: ['e1', 'e2', 'e3'] }]);
  assert.equal(days[0].canUpgrade, true);
  const out = priceDays(days, ctx, v);
  assert.equal(out.days[0].mode, 'full_day'); assert.equal(out.pricing.final, 55250); assert.equal(out.notes.length, 1);
});
t('the upgrade uses the vendor full-day price when it is set', () => {
  const v = vend({ fullDay: { enabled: true, price: 50000 } });
  const out = priceDays(resolve(v, [{ date: A, mode: 'events', events: ['e1', 'e2', 'e3'] }]), ctx, v);
  assert.equal(out.days[0].packagePrice, 50000); assert.equal(out.pricing.packageSavings, 15000); assert.equal(out.pricing.final, 50000);
});
t('no upgrade when picking events individually is cheaper', () => {
  const r = rules({ maxPercent: 100 }); r.multiEvent.tiers = [{ minEvents: 3, percent: 20 }];
  // events: 65,000 - 20% = 52,000 beats full day 55,250
  const v = vend(); const out = priceDays(resolve(v, [{ date: A, mode: 'events', events: ['e1', 'e2', 'e3'] }]), { rules: r, priorBookings: 0 }, v);
  assert.equal(out.days[0].mode, 'events'); assert.equal(out.pricing.final, 52000); assert.deepEqual(out.notes, []);
});
t('no upgrade offered when full-day packages are off', () => {
  const v = vend(); const days = resolve(v, [{ date: A, mode: 'events', events: ['e1', 'e2', 'e3'] }], { ...settings, fullDayPackages: false });
  assert.equal(days[0].canUpgrade, false); assert.equal(priceDays(days, ctx, v).days[0].mode, 'events');
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
