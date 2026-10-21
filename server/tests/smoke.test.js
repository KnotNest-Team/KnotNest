/**
 * API smoke test: `npm test` (needs the API running, e.g. `npm run dev` in another terminal).
 * Exercises the endpoints the React app uses, as customer, vendor and admin. Uses Node 18+ built-in fetch.
 * Set API_URL to test another host. Run against a seeded database (demo accounts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(dir, '..', '.env');
const port = (fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^PORT=(\d+)/m)?.[1]) || 5001;
const BASE = (process.env.API_URL || `http://localhost:${port}`) + '/api';

let pass = 0; const fails = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fails.push(name); console.log(`  FAIL ${name} ${extra}`); } };

async function call(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + url, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  let data = null; try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data?.token;

(async () => {
  console.log(`API smoke test against ${BASE}\n`);
  const health = await call('GET', '/health');
  if (health.status !== 200) { console.error(`API not reachable at ${BASE}. Start it with: npm run dev`); process.exit(2); }

  console.log('Public');
  const home = await call('GET', '/content/home');
  ok('GET /content/home', home.status === 200 && home.data.stories?.length > 0 && home.data.categories?.length > 0, JSON.stringify(home.data).slice(0, 120));
  const cats = await call('GET', '/categories');
  ok('GET /categories', cats.status === 200 && cats.data.categories.length >= 10);
  ok('GET /locations', (await call('GET', '/locations')).status === 200);
  const list = await call('GET', '/vendors?search=photographer');
  ok('GET /vendors?search', list.status === 200 && list.data.vendors.length >= 1);
  ok('GET /vendors filters combine', (await call('GET', '/vendors?city=Mumbai&verified=true&minPrice=1000&maxPrice=500000&rating=1&sort=rating&page=1&limit=5')).status === 200);
  ok('GET /vendors?category=Photography', (await call('GET', '/vendors?category=Photography')).data.total >= 1);
  const vid = list.data.vendors[0]._id;
  const one = await call('GET', `/vendors/${vid}`);
  ok('GET /vendors/:id', one.status === 200 && one.data.vendor.businessName);
  ok('GET /reviews/vendor/:id', (await call('GET', `/reviews/vendor/${vid}`)).status === 200);
  ok('GET /vendors/compare', (await call('GET', `/vendors/compare?ids=${vid}`)).data.vendors.length === 1);
  ok('POST /contact', (await call('POST', '/contact', { body: { name: 'Smoke', email: 'smoke@example.com', message: 'Hello from the smoke test' } })).status === 201);

  console.log('Auth');
  ok('login: wrong password -> 401', (await call('POST', '/auth/login', { body: { email: 'user@knotnest.com', password: 'nope' } })).status === 401);
  ok('login: NoSQL operator rejected', (await call('POST', '/auth/login', { body: { email: { $gt: '' }, password: 'x' } })).status === 400);
  const email = `smoke_${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password: 'Smoke@123', phone: '9999999999', role: 'customer' } });
  ok('register customer', reg.status === 201 && reg.data.token);
  ok('register duplicate -> 409', (await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password: 'Smoke@123' } })).status === 409);
  const bizName = `Smoke Studio ${Date.now()}`;
  const vreg = await call('POST', '/auth/register', { body: { name: 'Smoke Vendor', email: `v_${email}`, password: 'Smoke@123', role: 'vendor', businessName: bizName, category: cats.data.categories[0]._id, city: 'Pune' } });
  ok('register vendor (creates pending profile)', vreg.status === 201 && vreg.data.user.vendor?.status === 'pending');
  ok('GET /auth/me', (await call('GET', '/auth/me', { token: reg.data.token })).data.user.email === email);
  const newWedding = await call('POST', '/wedding', { token: reg.data.token, body: { partnerName: 'Smoke Partner', budget: 1000000, guestCount: 100 } });
  ok('new customer creates wedding (10 default checklist tasks)', newWedding.status === 201 && newWedding.data.wedding.checklist.length === 10, JSON.stringify(newWedding.data).slice(0, 100));
  ok('wedding linked to user', (await call('GET', '/auth/me', { token: reg.data.token })).data.user.wedding === newWedding.data.wedding._id);
  ok('second wedding -> 409', (await call('POST', '/wedding', { token: reg.data.token, body: {} })).status === 409);
  ok('protected route without token -> 401', (await call('GET', '/auth/me')).status === 401);

  const [customer, vendor, admin] = await Promise.all([login('user@knotnest.com', 'User@123'), login('vendor@knotnest.com', 'Vendor@123'), login('admin@knotnest.com', 'Admin@123')]);
  ok('login all three demo roles', customer && vendor && admin);

  console.log('Customer');
  const t = customer;
  ok('GET /wedding/summary', (await call('GET', '/wedding/summary', { token: t })).data.checklist?.total > 0);
  const wed = await call('GET', '/wedding', { token: t });
  ok('GET /wedding', wed.data.wedding?.checklist.length > 0);
  ok('PUT /wedding', (await call('PUT', '/wedding', { token: t, body: { guestCount: 321 } })).data.wedding.guestCount === 321);
  const task = await call('POST', '/wedding/checklist', { token: t, body: { title: 'Smoke task' } });
  const tid = task.data.wedding.checklist.at(-1)._id;
  ok('checklist add', task.status === 201);
  ok('checklist complete', (await call('PUT', `/wedding/checklist/${tid}`, { token: t, body: { done: true } })).data.wedding.checklist.find((x) => x._id === tid).done === true);
  ok('checklist delete', (await call('DELETE', `/wedding/checklist/${tid}`, { token: t })).status === 200);
  const exp = await call('POST', '/expenses', { token: t, body: { category: 'Venue', amount: 1000, description: 'smoke' } });
  ok('expense add', exp.status === 201);
  ok('expense list/totals', (await call('GET', '/expenses', { token: t })).data.totalSpent > 0);
  ok('expense delete', (await call('DELETE', `/expenses/${exp.data.expense._id}`, { token: t })).status === 200);
  const fav = await call('POST', `/favourites/${vid}`, { token: t });
  ok('favourite toggle', fav.status === 200 && typeof fav.data.favourited === 'boolean');
  await call('POST', `/favourites/${vid}`, { token: t });
  ok('GET /favourites', (await call('GET', '/favourites', { token: t })).status === 200);
  ok('GET /notifications', (await call('GET', '/notifications', { token: t })).status === 200);

  console.log('Enquiry + booking + review flow');
  const enq = await call('POST', '/enquiries', { token: t, body: { vendor: vid, name: 'Demo Customer', email: 'user@knotnest.com', phone: '9876500001', message: 'Smoke enquiry, are you free?', guestCount: 150, eventType: 'Wedding' } });
  ok('customer sends enquiry', enq.status === 201);
  ok('customer lists own enquiries', (await call('GET', '/enquiries', { token: t })).data.enquiries.some((e) => e._id === enq.data.enquiry._id));
  const venq = await call('GET', '/enquiries', { token: vendor });
  const mine = venq.data.enquiries.find((e) => e._id === enq.data.enquiry._id);
  ok('vendor receives enquiry', !!mine);
  ok('vendor accepts enquiry', (await call('PUT', `/enquiries/${enq.data.enquiry._id}`, { token: vendor, body: { status: 'accepted', response: 'Yes!' } })).data.enquiry.status === 'accepted');
  ok('customer cannot update enquiry -> 403', (await call('PUT', `/enquiries/${enq.data.enquiry._id}`, { token: t, body: { status: 'rejected' } })).status === 403);

  const myVendor = (await call('GET', '/vendors/me/profile', { token: vendor })).data.vendor;
  let off = 300; const free = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  while (myVendor.unavailableDates.includes(free(off))) off += 1; // pick a date the vendor has not blocked yet (keeps the test re-runnable)
  const date = free(off);
  const bk = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: date, amount: 1, packageName: 'Gold', eventType: 'Wedding' } });
  ok('customer requests booking', bk.status === 201);
  ok('booking price comes from the vendor package, not the request', bk.data.booking?.pricing?.subtotal === myVendor.packages.find((p) => p.name === 'Gold').price && bk.data.booking.amount === bk.data.booking.pricing.final && bk.data.booking.amount !== 1, bk.data.booking?.amount);
  const bid = bk.data.booking._id;
  ok('duplicate open request for same vendor + date -> 409', (await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: date } })).status === 409);
  ok('booking in the past -> 400', (await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: free(-3) } })).status === 400);
  ok('unknown package -> 400', (await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: free(off + 1), packageName: 'Nope' } })).status === 400);
  ok('review before completion rejected', (await call('POST', '/reviews', { token: t, body: { booking: bid, rating: 5, comment: 'too early' } })).status === 400);

  console.log('Managed booking flow (admin reviews both directions)');
  const setMode = (mode) => call('PUT', '/admin/settings/platform', { token: admin, body: { bookingApproval: mode } });
  ok('admin sets booking approval to manual', (await setMode('manual')).data.settings?.bookingApproval === 'manual');
  ok('new request waits for admin review', bk.data.booking.status === 'pending_review');
  ok('vendor does not see it before review', !(await call('GET', '/bookings', { token: vendor })).data.bookings.some((x) => x._id === bid));
  ok('vendor cannot act before review -> 400', (await call('PUT', `/bookings/${bid}`, { token: vendor, body: { status: 'vendor_accepted' } })).status === 400);
  const q = await call('GET', '/admin/booking-reviews', { token: admin });
  ok('admin review queue lists it with checks', q.data.bookings.some((x) => x._id === bid && x.checks && typeof x.waitingHours === 'number'));
  ok('customer cannot see the admin queue -> 403', (await call('GET', '/admin/booking-reviews', { token: t })).status === 403);
  ok('admin rejection needs a reason -> 400', (await call('PUT', `/bookings/${bid}`, { token: admin, body: { status: 'cancelled' } })).status === 400);
  ok('admin approves and forwards to vendor', (await call('PUT', `/bookings/${bid}`, { token: admin, body: { status: 'requested', note: 'Checked' } })).data.booking.status === 'requested');
  ok('vendor now sees it', (await call('GET', '/bookings', { token: vendor })).data.bookings.some((x) => x._id === bid));
  ok('vendor accepts (date held)', (await call('PUT', `/bookings/${bid}`, { token: vendor, body: { status: 'vendor_accepted', note: 'Delighted to!' } })).data.booking.status === 'vendor_accepted');
  ok('date now blocked on vendor', (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates.includes(date));
  ok('customer cannot confirm before admin forwards -> 400', (await call('PUT', `/bookings/${bid}`, { token: t, body: { status: 'confirmed' } })).status === 400);
  ok('admin forwards vendor offer to couple', (await call('PUT', `/bookings/${bid}`, { token: admin, body: { status: 'awaiting_customer' } })).data.booking.status === 'awaiting_customer');
  const conf = await call('PUT', `/bookings/${bid}`, { token: t, body: { status: 'confirmed' } });
  ok('couple confirms', conf.data.booking?.status === 'confirmed');
  ok('timeline records every step', conf.data.booking.history.map((h) => h.status).join(',') === 'pending_review,requested,vendor_accepted,awaiting_customer,confirmed', conf.data.booking.history.map((h) => h.status).join(','));

  // vendor decline goes back through the admin
  const dDate = free(off + 3);
  const db = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: dDate } });
  await call('PUT', `/bookings/${db.data.booking._id}`, { token: admin, body: { status: 'requested' } });
  ok('vendor declines -> admin review', (await call('PUT', `/bookings/${db.data.booking._id}`, { token: vendor, body: { status: 'vendor_declined', note: 'Busy' } })).data.booking.status === 'vendor_declined');
  ok('admin passes decline to couple', (await call('PUT', `/bookings/${db.data.booking._id}`, { token: admin, body: { status: 'cancelled', note: 'Try Studio X instead' } })).data.booking.status === 'cancelled');

  // auto mode: verified vendors skip both reviews
  await call('PUT', `/admin/vendors/${myVendor._id}/moderate`, { token: admin, body: { action: 'verify' } });
  await setMode('auto_verified');
  const aDate = free(off + 4);
  const ab = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: aDate } });
  ok('auto mode: verified vendor gets the request directly', ab.data.booking?.status === 'requested', ab.data.booking?.status);
  ok('auto mode: unchanged acceptance goes straight to couple', (await call('PUT', `/bookings/${ab.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } })).data.booking.status === 'awaiting_customer');
  await call('PUT', `/bookings/${ab.data.booking._id}`, { token: t, body: { status: 'cancelled' } });
  ok('cancelling releases the held date', !(await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates.includes(aDate));
  await setMode('manual');

  // multi-day: one booking for several days, priced per day, held and released together
  const pk = (n) => myVendor.packages.find((p) => p.name === n).price;
  const md = [free(off + 6), free(off + 7), free(off + 8)];
  const mb = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, days: [{ date: md[0], packageName: 'Silver' }, { date: md[1], packageName: 'Gold' }, { date: md[2], packageName: 'Silver' }], notes: 'Three days please' } });
  ok('multi-day booking: one booking, three days', mb.status === 201 && mb.data.booking.days.length === 3, JSON.stringify(mb.data).slice(0, 200));
  ok('multi-day subtotal = sum of each day, total = subtotal less discounts', mb.data.booking.pricing.subtotal === pk('Silver') * 2 + pk('Gold') && mb.data.booking.amount === mb.data.booking.pricing.subtotal - mb.data.booking.pricing.totalDiscount && mb.data.booking.pricing.discounts.some((d) => d.type === 'multi_day'));
  ok('same day twice -> 400', (await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, days: [{ date: free(off + 9) }, { date: free(off + 9) }] } })).status === 400);
  ok('overlapping open booking -> 409', (await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, days: [{ date: md[2] }, { date: free(off + 9) }] } })).status === 409);
  await call('PUT', `/bookings/${mb.data.booking._id}`, { token: admin, body: { status: 'requested' } });
  await call('PUT', `/bookings/${mb.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
  let cal = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates;
  ok('vendor acceptance holds every day', md.every((x) => cal.includes(x)));
  const rq = (await call('GET', '/admin/booking-reviews', { token: admin })).data.bookings.find((x) => x._id === mb.data.booking._id);
  ok('admin review shows days and listed-price check', rq?.checks.days === 3 && rq.checks.priceAsListed === true);
  await call('PUT', `/bookings/${mb.data.booking._id}`, { token: admin, body: { status: 'cancelled', note: 'Smoke cleanup' } });
  cal = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates;
  ok('cancelling releases every day', md.every((x) => !cal.includes(x)));
  // a request touching an already-held day can't be accepted
  const hb = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, days: [{ date: md[0] }] } });
  const other2 = await call('POST', '/auth/register', { body: { name: 'Overlap Tester', email: `overlap_${Date.now()}@example.com`, password: 'Over@1234' } });
  const ob = await call('POST', '/bookings', { token: other2.data.token, body: { vendor: myVendor._id, days: [{ date: md[0] }, { date: md[1] }] } });
  for (const x of [hb, ob]) await call('PUT', `/bookings/${x.data.booking._id}`, { token: admin, body: { status: 'requested' } });
  await call('PUT', `/bookings/${hb.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
  const clash = await call('PUT', `/bookings/${ob.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
  cal = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates;
  ok('all-or-nothing: a partly taken booking holds none of its days', clash.status === 409 && !cal.includes(md[1]), clash.data.message);
  await call('PUT', `/bookings/${hb.data.booking._id}`, { token: admin, body: { status: 'cancelled', note: 'Smoke cleanup' } });
  await call('PUT', `/bookings/${ob.data.booking._id}`, { token: admin, body: { status: 'cancelled', note: 'Smoke cleanup' } });

  // helper: walk a booking through the whole managed flow
  const confirmFlow = async (id, tok = t) => {
    await call('PUT', `/bookings/${id}`, { token: admin, body: { status: 'requested' } });
    const acc = await call('PUT', `/bookings/${id}`, { token: vendor, body: { status: 'vendor_accepted' } });
    if (acc.status !== 200) return acc;
    await call('PUT', `/bookings/${id}`, { token: admin, body: { status: 'awaiting_customer' } });
    return call('PUT', `/bookings/${id}`, { token: tok, body: { status: 'confirmed' } });
  };

  // race: two requests for the same date (different couples): only one vendor acceptance can win
  const other = await call('POST', '/auth/register', { body: { name: 'Race Tester', email: `race_${Date.now()}@example.com`, password: 'Race@1234' } });
  const raceDate = free(off + 2);
  const [r1, r2] = await Promise.all([
    call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: raceDate } }),
    call('POST', '/bookings', { token: other.data.token, body: { vendor: myVendor._id, weddingDate: raceDate } }),
  ]);
  for (const r of [r1, r2]) await call('PUT', `/bookings/${r.data.booking._id}`, { token: admin, body: { status: 'requested' } });
  const accepts = await Promise.all([r1, r2].map((r) => call('PUT', `/bookings/${r.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } })));
  ok('two simultaneous acceptances for one date: exactly one wins', accepts.filter((c) => c.status === 200).length === 1 && accepts.some((c) => c.status === 409), JSON.stringify(accepts.map((c) => [c.status, c.data.message])));
  for (const [i, r] of [r1, r2].entries()) await call('PUT', `/bookings/${r.data.booking._id}`, { token: accepts[i].status === 200 ? vendor : admin, body: { status: 'cancelled', note: 'Smoke test cleanup' } });

  ok('vendor cannot complete a future event -> 400', (await call('PUT', `/bookings/${bid}`, { token: vendor, body: { status: 'completed' } })).status === 400);
  ok('admin can complete (record correction)', (await call('PUT', `/bookings/${bid}`, { token: admin, body: { status: 'completed' } })).data.booking.status === 'completed');
  ok('customer reviews completed booking', (await call('POST', '/reviews', { token: t, body: { booking: bid, rating: 4, comment: 'Lovely smoke test review' } })).status === 201);
  ok('customer lists bookings', (await call('GET', '/bookings', { token: t })).data.bookings.length > 0);

  console.log('Payments (advance, simulated without Razorpay keys)');
  const payDate = free(off + 5);
  const pb = await call('POST', '/bookings', { token: t, body: { vendor: myVendor._id, weddingDate: payDate, packageName: 'Silver' } });
  ok('advance before confirmation -> 400', (await call('POST', '/payments/order', { token: t, body: { booking: pb.data.booking._id } })).status === 400);
  await confirmFlow(pb.data.booking._id);
  const order = await call('POST', '/payments/order', { token: t, body: { booking: pb.data.booking._id } });
  ok('create advance order', order.status === 201 && order.data.amount === Math.round(pb.data.booking.amount * 0.1), JSON.stringify(order.data).slice(0, 120));
  ok('vendor cannot create orders -> 403', (await call('POST', '/payments/order', { token: vendor, body: { booking: pb.data.booking._id } })).status === 403);
  if (order.data.mode === 'demo') {
    const v = await call('POST', '/payments/verify', { token: t, body: { orderId: order.data.orderId } });
    ok('verify payment marks advance paid', v.status === 200 && v.data.booking.advancePaid === true);
    ok('paying twice -> 409', (await call('POST', '/payments/order', { token: t, body: { booking: pb.data.booking._id } })).status === 409);
  }
  await call('PUT', `/bookings/${pb.data.booking._id}`, { token: vendor, body: { status: 'cancelled' } });

  console.log('Flexible wedding bookings (full day, selected events, several days, discounts)');
  {
    const DEFAULTS = { enabled: true, fullDay: { enabled: true, percent: 15 }, multiEvent: { enabled: true, tiers: [{ minEvents: 2, percent: 5 }, { minEvents: 3, percent: 10 }] }, multiDay: { enabled: true, minDays: 2, percent: 10 }, repeat: { enabled: true, percent: 5, minPriorBookings: 1 }, stacking: 'stack', priority: ['full_day', 'multi_event', 'multi_day', 'repeat'], maxPercent: 20 };
    const saveRules = (discounts, extra = {}) => call('PUT', '/admin/settings/platform', { token: admin, body: { discounts, ...extra } });
    ok('admin sets the discount rules', (await saveRules(DEFAULTS, { fullDayPackages: true, eventSlotHours: 4 })).data.settings?.discounts?.fullDay?.percent === 15);
    ok('discount over 100% -> 400', (await saveRules({ maxPercent: 150 })).status === 400);
    ok('incomplete priority list -> 400', (await saveRules({ priority: ['repeat'] })).status === 400);
    ok('customer cannot change discount rules -> 403', (await call('PUT', '/admin/settings/platform', { token: t, body: { discounts: { maxPercent: 90 } } })).status === 403);

    // the demo vendor's own prices per event (restored afterwards)
    const before = (await call('GET', '/vendors/me/profile', { token: vendor })).data.vendor;
    const PRICES = [{ eventName: 'Haldi', price: 15000 }, { eventName: 'Mehendi', price: 20000 }, { eventName: 'Sangeet', price: 30000 }, { eventName: 'Wedding', price: 50000 }, { eventName: 'Reception', price: 40000 }];
    const vp = await call('PUT', `/vendors/${myVendor._id}`, { token: vendor, body: { eventPricing: PRICES, eventsOffered: [], fullDay: { enabled: true, price: 0 } } });
    ok('vendor sets event prices and full-day package', vp.status === 200 && vp.data.vendor.eventPricing.length === 5 && vp.data.vendor.fullDay.enabled === true);

    // a fresh couple (no earlier bookings) with two wedding days
    const mk = async (label) => {
      const u = await call('POST', '/auth/register', { body: { name: `Flex ${label}`, email: `flex_${label}_${Date.now()}@example.com`, password: 'Flex@1234' } });
      await call('POST', '/wedding', { token: u.data.token, body: { partnerName: 'Test' } });
      return u.data.token;
    };
    const c1 = await mk('one'); const c2 = await mk('two');
    let base = 400; const cal0 = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor.unavailableDates;
    while (cal0.includes(free(base)) || cal0.includes(free(base + 1))) base += 2;
    const A = free(base); const B = free(base + 1);
    const addEvents = async (tok) => {
      for (const [name, date, time] of [['Haldi', A, '10:00 AM'], ['Mehendi', A, '2:00 PM'], ['Sangeet', A, '7:00 PM'], ['Wedding', B, '11:00 AM'], ['Reception', B, '7:00 PM']]) await call('POST', '/wedding/events', { token: tok, body: { name, date, time } });
      const evs = (await call('GET', '/wedding', { token: tok })).data.events;
      return Object.fromEntries(evs.map((e) => [e.name, e._id]));
    };
    const E = await addEvents(c1); const E2 = await addEvents(c2);
    const plan = await call('GET', '/bookings/plan', { token: c1 });
    ok('plan groups events by wedding day', plan.status === 200 && plan.data.days.length === 2 && plan.data.days[0].events.length === 3 && plan.data.days[0].events[0].name === 'Haldi');
    const q = (days, tok = c1, vend = myVendor._id) => call('POST', '/bookings/quote', { token: tok, body: { items: [{ vendor: vend, days }] } });
    const fin = (r) => r.data.totals?.final;

    const one = await q([{ date: A, mode: 'events', events: [E.Haldi] }]);
    ok('one event: individual price, no multi-event discount', fin(one) === 15000 && one.data.items[0].pricing.totalDiscount === 0 && one.data.items[0].bookingType === 'single_event', JSON.stringify(one.data).slice(0, 300));
    const two = await q([{ date: A, mode: 'events', events: [E.Haldi, E.Sangeet] }]);
    ok('two events on the same day: 5% multi-event', fin(two) === 42750 && two.data.items[0].pricing.discounts[0].type === 'multi_event' && two.data.items[0].pricing.discounts[0].reason.length > 10);
    const three = await q([{ date: A, mode: 'events', events: [E.Haldi, E.Mehendi, E.Sangeet] }]);
    ok('every event of the day ticked: priced as the full-day package', fin(three) === 55250 && three.data.items[0].days[0].mode === 'full_day' && three.data.items[0].notes.length === 1);
    const removed = await q([{ date: A, mode: 'events', events: [E.Haldi, E.Mehendi] }]);
    ok('removing an event recalculates (back to 5%)', fin(removed) === 33250);
    const full = await q([{ date: A, mode: 'full_day' }]);
    const fp = full.data.items[0].pricing;
    ok('full day: events, individual prices, discount and final (65,000 -> 55,250)', fp.subtotal === 65000 && fp.discounts[0].type === 'full_day' && fp.discounts[0].amount === 9750 && fp.final === 55250 && full.data.items[0].days[0].events.map((e) => e.price).join() === '15000,20000,30000');
    const dbl = await q([{ date: A, mode: 'full_day' }, { date: A, mode: 'events', events: [E.Sangeet] }]);
    ok('full day + one of its events again: never charged twice', fin(dbl) === 55250 && dbl.data.items[0].days.length === 1 && dbl.data.items[0].days[0].events.length === 3);
    const dupEv = await q([{ date: A, mode: 'events', events: [E.Haldi, E.Haldi] }]);
    ok('same event listed twice in one booking: charged once', fin(dupEv) === 15000);
    const across = await q([{ date: A, mode: 'events', events: [E.Haldi, E.Mehendi] }, { date: B, mode: 'events', events: [E.Wedding] }]);
    ok('selected events across two days: per-day + multi-day discounts', fin(across) === 74750 && across.data.totals.days === 2 && across.data.items[0].pricing.discounts.map((d) => d.type).join() === 'multi_event,multi_day', JSON.stringify(across.data.items[0].pricing.discounts));
    const both = await q([{ date: A, mode: 'full_day' }, { date: B, mode: 'full_day' }]);
    ok('full days on two days: maximum discount (20%) applied', fin(both) === 124000 && both.data.items[0].pricing.capped === true && both.data.items[0].pricing.totalDiscount === 31000);
    ok('wrong date for an event -> explained error', (await q([{ date: B, mode: 'events', events: [E.Haldi] }])).data.items[0].error?.includes('Haldi'));
    ok("another couple's event -> error", !!(await q([{ date: A, mode: 'events', events: [E2.Haldi] }])).data.items[0].error);

    // several vendors in one checkout (different vendors for different events)
    const other = (await call('GET', '/vendors?category=Videographers', {})).data.vendors[0];
    const av = await call('POST', '/bookings/available-vendors', { token: c1, body: { category: 'Videographers', days: [{ date: B, mode: 'events', events: [E.Wedding] }] } });
    ok('available vendors for a selection, each with its own price', av.status === 200 && av.data.vendors.length >= 1 && av.data.vendors.some((x) => x.available && x.pricing?.final > 0));
    const mix = await call('POST', '/bookings/quote', { token: c1, body: { items: [{ vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E.Haldi] }] }, { vendor: other._id, days: [{ date: B, mode: 'events', events: [E.Wedding] }] }] } });
    ok('two vendors on two days: multi-day discount for both', mix.data.items.every((x) => x.pricing.discounts.some((d) => d.type === 'multi_day')) && mix.data.totals.vendors === 2);
    ok('price sent by the browser is rejected when it does not match', (await call('POST', '/bookings/checkout', { token: c1, body: { expectedTotal: 1, items: [{ vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E.Haldi] }] }] } })).status === 409);
    const co = await call('POST', '/bookings/checkout', { token: c1, body: { expectedTotal: mix.data.totals.final, notes: 'Two vendors', items: [{ vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E.Haldi] }] }, { vendor: other._id, days: [{ date: B, mode: 'events', events: [E.Wedding] }] }] } });
    ok('checkout creates one booking per vendor in one group', co.status === 201 && co.data.bookings.length === 2 && co.data.checkout && co.data.bookings.every((b) => b.checkout === co.data.checkout && b.wedding && b.pricing.version === 2));
    const [bHaldi, bVideo] = co.data.bookings;
    ok('booking keeps events, times and pricing snapshot', bHaldi.days[0].mode === 'events' && bHaldi.days[0].events[0].time === '10:00 AM' && bHaldi.days[0].events[0].start === 600 && bHaldi.pricing.rules?.maxPercent === 20);
    ok('the same event again with the same vendor -> 409', (await call('POST', '/bookings', { token: c1, body: { vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E.Haldi, E.Sangeet] }] } })).status === 409);
    const manip = await call('POST', '/bookings', { token: c1, body: { vendor: myVendor._id, amount: 1, discount: 99, pricing: { final: 1, totalDiscount: 99999 }, days: [{ date: A, mode: 'events', events: [E.Sangeet], price: 1 }] } });
    ok('manipulated price fields are ignored (server price)', manip.status === 201 && manip.data.booking.amount === 30000 && manip.data.booking.pricing.final === 30000);
    ok('a different event with the same vendor on the same day is fine', manip.data.booking.days[0].events[0].name === 'Sangeet');

    // vendor double-booking: overlapping times for two couples, only one acceptance wins; other times stay free
    const s2 = await call('POST', '/bookings', { token: c2, body: { vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E2.Sangeet] }] } });
    const h2 = await call('POST', '/bookings', { token: c2, body: { vendor: myVendor._id, days: [{ date: A, mode: 'events', events: [E2.Mehendi] }] } });
    for (const id of [manip.data.booking._id, s2.data.booking._id, h2.data.booking._id, bHaldi._id]) await call('PUT', `/bookings/${id}`, { token: admin, body: { status: 'requested' } });
    const acc = await Promise.all([manip, s2].map((x) => call('PUT', `/bookings/${x.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } })));
    ok('two couples, same vendor, overlapping time: exactly one acceptance wins', acc.filter((x) => x.status === 200).length === 1 && acc.some((x) => x.status === 409), JSON.stringify(acc.map((x) => [x.status, x.data.message])));
    // Haldi 10 AM (couple one) and Mehendi 2 PM (couple two) do not overlap the 7 PM sangeet
    const accH = await call('PUT', `/bookings/${bHaldi._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
    const accM = await call('PUT', `/bookings/${h2.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
    ok('different times on the same day can go to different couples', accH.status === 200 && accM.status === 200, `${accH.status} ${accM.status} ${accM.data.message}`);
    const slots = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor;
    ok('event bookings hold time slots, not the whole day', !slots.unavailableDates.includes(A) && slots.bookedSlots.filter((x) => x.date === A).length >= 2);
    const pub = (await call('GET', `/vendors/${myVendor._id}`)).data.vendor;
    ok('public profile shows busy times without booking ids', pub.bookedSlots.length > 0 && pub.bookedSlots.every((x) => !x.booking));
    const fdClash = await q([{ date: A, mode: 'full_day' }], c2);
    ok('a partly booked day cannot be sold as a full day', fdClash.data.items[0].issues.some((i) => i.type === 'unavailable'));

    // couple one confirms Haldi -> it becomes a qualifying earlier booking (repeat discount)
    await call('PUT', `/bookings/${bHaldi._id}`, { token: admin, body: { status: 'awaiting_customer' } });
    const conf = await call('PUT', `/bookings/${bHaldi._id}`, { token: c1, body: { status: 'confirmed' } });
    ok('couple confirms: price locked with the snapshot', conf.data.booking.status === 'confirmed' && conf.data.booking.pricing.confirmedAt && conf.data.booking.amount === bHaldi.pricing.final && bHaldi.pricing.final === 13500);
    const rep = await q([{ date: B, mode: 'events', events: [E.Reception] }]);
    ok('repeat-customer discount once a booking is confirmed', rep.data.items[0].pricing.discounts.some((d) => d.type === 'repeat') && rep.data.priorBookings === 1);
    // couple two only has cancelled / declined bookings: no repeat discount
    for (const x of [s2, h2]) await call('PUT', `/bookings/${x.data.booking._id}`, { token: c2, body: { status: 'cancelled' } });
    const rep2 = await q([{ date: B, mode: 'events', events: [E2.Reception] }], c2);
    ok('cancelled or rejected bookings never count as repeat bookings', !rep2.data.items[0].pricing.discounts.some((d) => d.type === 'repeat') && rep2.data.priorBookings === 0);

    // admin changes the rules after confirmation: the confirmed price stays, new quotes change
    await saveRules({ fullDay: { percent: 30 }, maxPercent: 40 });
    const after = (await call('GET', '/bookings', { token: c1 })).data.bookings.find((b) => b._id === bHaldi._id);
    ok('confirmed price is kept after the admin changes discounts', after.amount === 13500 && after.pricing.rules.fullDay.percent === 15);
    ok('new quotes use the new rules', fin(await q([{ date: A, mode: 'full_day' }])) !== 55250);
    await saveRules(DEFAULTS);

    // vendor switches off full-day packages; vendors that don't cover an event
    await call('PUT', `/vendors/${myVendor._id}`, { token: vendor, body: { fullDay: { enabled: false, price: 0 } } });
    ok('vendor without full-day packages -> explained error', (await q([{ date: B, mode: 'full_day' }])).data.items[0].error?.includes('full-day'));
    const henna = (await call('GET', '/vendors?category=Mehendi Artists', {})).data.vendors[0];
    if (henna) ok('vendor that does not provide an event -> error', (await q([{ date: A, mode: 'events', events: [E.Haldi] }], c1, henna._id)).data.items[0].error?.includes('does not provide'));

    // the couple reschedules a booked event: the booking keeps its time and gets an alert
    await call('PUT', `/wedding/events/${E.Sangeet}`, { token: c1, body: { name: 'Sangeet', date: A, time: '9:00 PM' } });
    const alerted = (await call('GET', '/bookings', { token: c1 })).data.bookings.find((b) => b._id === manip.data.booking._id);
    ok('rescheduled event: booking flagged, original time kept', alerted.alerts.some((a) => a.type === 'event_rescheduled') && alerted.days[0].events[0].time === '7:00 PM');
    ok('vendor sees the booking grouped with its events', (await call('GET', '/bookings', { token: vendor })).data.bookings.some((b) => b._id === bHaldi._id && b.days[0].events[0].name === 'Haldi'));

    // the vendor becomes unavailable (suspended) after accepting, before the couple confirms
    const late = await call('POST', '/bookings', { token: c2, body: { vendor: myVendor._id, days: [{ date: B, mode: 'events', events: [E2.Reception] }] } });
    await call('PUT', `/bookings/${late.data.booking._id}`, { token: admin, body: { status: 'requested' } });
    await call('PUT', `/bookings/${late.data.booking._id}`, { token: vendor, body: { status: 'vendor_accepted' } });
    await call('PUT', `/bookings/${late.data.booking._id}`, { token: admin, body: { status: 'awaiting_customer' } });
    await call('PUT', `/admin/vendors/${myVendor._id}/moderate`, { token: admin, body: { action: 'suspend' } });
    ok('vendor no longer available before confirmation -> 409', (await call('PUT', `/bookings/${late.data.booking._id}`, { token: c2, body: { status: 'confirmed' } })).status === 409);
    await call('PUT', `/admin/vendors/${myVendor._id}/moderate`, { token: admin, body: { action: 'approve' } });
    await call('PUT', `/bookings/${late.data.booking._id}`, { token: admin, body: { status: 'cancelled', note: 'Smoke cleanup' } });

    const stats = await call('GET', '/admin/booking-stats', { token: admin });
    ok('admin booking analytics', stats.status === 200 && stats.data.totals.bookings > 0 && stats.data.totals.discountsGranted >= 0 && stats.data.byType.length > 0 && stats.data.trend.length === 6);
    ok('vendor blocked from booking analytics -> 403', (await call('GET', '/admin/booking-stats', { token: vendor })).status === 403);

    // clean up: release holds and restore the vendor listing
    for (const id of [bHaldi._id, manip.data.booking._id, bVideo._id]) await call('PUT', `/bookings/${id}`, { token: admin, body: { status: 'cancelled', note: 'Smoke cleanup' } });
    await call('PUT', `/vendors/${myVendor._id}`, { token: vendor, body: { eventPricing: before.eventPricing || [], eventsOffered: before.eventsOffered || [], fullDay: before.fullDay || { enabled: true, price: 0 } } });
    const clean = (await call('GET', `/vendors/${myVendor._id}`, { token: vendor })).data.vendor;
    ok('cancelling releases event time slots', !clean.bookedSlots.some((x) => x.date === A));
  }

  console.log('Tradition-based planning');
  // clean up leftovers from an interrupted earlier run
  for (const e of ((await call('GET', '/wedding', { token: t })).data.events || []).filter((x) => x.name.startsWith('Smoke '))) await call('DELETE', `/wedding/events/${e._id}`, { token: t });
  const tr = await call('GET', '/wedding/traditions', { token: t });
  ok('list traditions', tr.data.traditions?.length >= 10 && tr.data.traditions.some((x) => x.key === 'gujarati'));
  const pl = await call('POST', '/wedding/events/plan', { token: t, body: { culture: 'gujarati', partnerCulture: 'punjabi', weddingDate: free(200), muhurat: '21:15' } });
  ok('plan Gujarati + Punjabi events', pl.status === 200 && pl.data.events.some((e) => e.name === 'Garba & Dandiya Raas') && pl.data.events.some((e) => e.tradition === 'Punjabi (Hindu)'));
  ok('muhurat sets the main ceremony time', pl.data.events.find((e) => e.main)?.time === '9:15 PM (muhurat)');
  ok('plan includes meanings', pl.data.events.every((e) => e.meaning));
  ok('unknown tradition -> 400', (await call('POST', '/wedding/events/plan', { token: t, body: { culture: 'atlantis' } })).status === 400);
  const pick2 = pl.data.events.filter((e) => e.selected).slice(0, 2).map((e) => ({ ...e, name: `Smoke ${e.name}`, time: 'Edited time' }));
  const ap = await call('POST', '/wedding/events/apply', { token: t, body: { events: [...pick2, { name: 'Smoke Cricket Match', date: free(199), time: '7 AM', hostSide: 'groom' }] } });
  ok('apply chosen + custom events with personal edits', ap.status === 201 && ap.data.added === 3 && ap.data.events?.some((e) => e.name.startsWith('Smoke ') && e.time === 'Edited time'), `${ap.status} ${JSON.stringify(ap.data).slice(0, 300)} picks=${pick2.map((x) => x.name)}`);
  const ap2 = await call('POST', '/wedding/events/apply', { token: t, body: { events: pick2 } });
  ok('re-applying never duplicates', ap2.data.added === 0);
  const dem = await call('GET', '/wedding/guests', { token: t });
  const cricket = ap.data.events.find((e) => e.name === 'Smoke Cricket Match');
  ok('new events invite guests by side', dem.data.guests.filter((g) => g.events.some((x) => x.event === cricket._id)).every((g) => g.side !== 'bride'));
  const wbefore = (await call('GET', '/wedding', { token: t })).data;
  const shiftTo = new Date(new Date(wbefore.wedding.weddingDate).getTime() + 3 * 864e5).toISOString().slice(0, 10);
  const sh = await call('PUT', '/wedding', { token: t, body: { weddingDate: shiftTo, shiftEvents: true } });
  const moved = sh.data.events.find((e) => e._id === cricket._id);
  ok('moving the wedding date shifts events and keeps edits', sh.data.shifted === wbefore.events.length && new Date(moved.date) - new Date(cricket.date) === 3 * 864e5 && moved.time === '7 AM');
  await call('PUT', '/wedding', { token: t, body: { weddingDate: wbefore.wedding.weddingDate.slice(0, 10), shiftEvents: true } });
  for (const e of ap.data.events.filter((x) => x.name.startsWith('Smoke '))) await call('DELETE', `/wedding/events/${e._id}`, { token: t });
  const fresh = await call('POST', '/auth/register', { body: { name: 'Planner Test', email: `planner_${Date.now()}@example.com`, password: 'Plan@1234' } });
  const fw = await call('POST', '/wedding', { token: fresh.data.token, body: { weddingDate: free(150), culture: 'marathi', partnerName: 'Test' } });
  ok('new wedding plans its events automatically', fw.status === 201 && fw.data.planned >= 5 && fw.data.events.some((e) => e.name === 'Halad Chadavane'));
  ok('checklist due dates come from the wedding date', fw.data.wedding.checklist.every((c) => c.dueDate));

  const pv = await call('GET', '/wedding/rsvp-preview', { token: t });
  ok('RSVP preview uses the tradition design', pv.status === 200 && pv.data.theme === 'royal' && pv.data.preview === true);
  await call('PUT', '/wedding', { token: t, body: { inviteTheme: 'marathi' } });
  ok('couple can pick another design', (await call('GET', '/wedding/rsvp-preview', { token: t })).data.theme === 'marathi');
  ok('unknown design -> 400', (await call('PUT', '/wedding', { token: t, body: { inviteTheme: 'disco' } })).status === 400);
  await call('PUT', '/wedding', { token: t, body: { inviteTheme: '' } });

  console.log('Wedding events, guests and RSVP');
  const evRes = await call('POST', '/wedding/events', { token: t, body: { name: 'Smoke Sangeet', date: free(100), time: '7 PM', venueName: 'Smoke Lawns', address: 'Smoke Road' } });
  ok('add wedding event', evRes.status === 201 && evRes.data.events.some((e) => e.name === 'Smoke Sangeet'));
  const smokeEv = evRes.data.events.find((e) => e.name === 'Smoke Sangeet');
  ok('event gets a map link', !!smokeEv.mapLink);
  ok('event without date -> 400', (await call('POST', '/wedding/events', { token: t, body: { name: 'No date' } })).status === 400);
  ok('edit event', (await call('PUT', `/wedding/events/${smokeEv._id}`, { token: t, body: { name: 'Smoke Sangeet', date: free(101), time: '8 PM' } })).data.events.find((e) => e._id === smokeEv._id).time === '8 PM');
  const wd = await call('GET', '/wedding', { token: t });
  ok('venue booking feeds the Wedding event live', wd.data.events.some((e) => e.venueFromBooking && e.venueName), JSON.stringify(wd.data.events.map((e) => [e.name, e.venueName])).slice(0, 200));
  const gEmail = `guest_${Date.now()}@example.com`;
  const g = await call('POST', '/wedding/guests', { token: t, body: { name: 'Smoke Guest Family', email: gEmail, maxGuests: 3, side: 'bride', events: [smokeEv._id] } });
  ok('add guest', g.status === 201 && g.data.guest.events.length === 1 && g.data.guest.token);
  ok('duplicate guest email -> 409', (await call('POST', '/wedding/guests', { token: t, body: { name: 'Again', email: gEmail } })).status === 409);
  ok('invalid guest email -> 400', (await call('POST', '/wedding/guests', { token: t, body: { name: 'Bad Email', email: 'not-an-email' } })).status === 400);
  const imp = await call('POST', '/wedding/guests/import', { token: t, body: { guests: [{ name: 'Import One', email: `i1_${Date.now()}@example.com` }, { name: 'X', email: 'bad' }, { name: 'Import Two' }] } });
  ok('import guests: valid added, invalid reported', imp.status === 201 && imp.data.added === 2 && imp.data.skipped.length === 1, JSON.stringify(imp.data));
  const gl = await call('GET', '/wedding/guests', { token: t });
  ok('guest list with summary', gl.status === 200 && gl.data.summary.invited >= 3 && gl.data.summary.perEvent.length > 0 && gl.data.mail?.mode);
  ok('vendor cannot read a guest list -> 403', (await call('GET', '/wedding/guests', { token: vendor })).status === 403);
  const prev = await call('GET', `/wedding/invites/preview?guest=${g.data.guest._id}`, { token: t });
  ok('invitation preview renders', prev.status === 200 && prev.data.html.includes('RSVP now') && prev.data.html.includes('Smoke Sangeet'));
  const sent = await call('POST', '/wedding/invites/send', { token: t, body: { guestIds: [g.data.guest._id] } });
  ok('send invitation (queued)', sent.status === 202 && sent.data.queued === 1, JSON.stringify(sent.data));
  let st = 'queued';
  for (let i = 0; i < 40 && st === 'queued'; i++) { await new Promise((r) => setTimeout(r, 500)); st = (await call('GET', '/wedding/guests', { token: t })).data.guests.find((x) => x._id === g.data.guest._id).invite.status; }
  ok('invitation delivered to the mail transport', st === 'sent', st);
  const token = g.data.guest.token;
  const pub = await call('GET', `/rsvp/${token}`);
  ok('public RSVP page opens without login', pub.status === 200 && pub.data.guest.events.length === 1 && pub.data.couple);
  ok('RSVP page hides other guests', !JSON.stringify(pub.data).includes('sharma.family@example.com') && !('email' in pub.data.guest));
  ok('bad token -> 404', (await call('GET', '/rsvp/notarealtoken12345678')).status === 404);
  ok('headcount above invitation -> 400', (await call('POST', `/rsvp/${token}`, { body: { responses: [{ event: smokeEv._id, status: 'attending', headcount: 9 }] } })).status === 400);
  const ans = await call('POST', `/rsvp/${token}`, { body: { responses: [{ event: smokeEv._id, status: 'attending', headcount: 2 }], foodPreference: 'Jain', guestNote: 'Congratulations!' } });
  ok('guest RSVPs', ans.status === 200 && ans.data.guest.events[0].status === 'attending' && ans.data.guest.foodPreference === 'Jain');
  const after = (await call('GET', '/wedding/guests', { token: t })).data.summary.perEvent.find((p) => p.event === smokeEv._id);
  ok('RSVP updates the couple\'s headcount', after?.headcount === 2, JSON.stringify(after));
  ok('guest can change answer later', (await call('POST', `/rsvp/${token}`, { body: { responses: [{ event: smokeEv._id, status: 'declined' }] } })).data.guest.events[0].status === 'declined');
  ok('delete event removes it from the plan and from guests', (await call('DELETE', `/wedding/events/${smokeEv._id}`, { token: t })).status === 200
    && !(await call('GET', '/wedding', { token: t })).data.events.some((e) => e._id === smokeEv._id)
    && (await call('GET', '/wedding/guests', { token: t })).data.guests.find((x) => x._id === g.data.guest._id).events.length === 0);
  for (const x of (await call('GET', '/wedding/guests', { token: t })).data.guests.filter((x) => /Smoke Guest|Import (One|Two)/.test(x.name))) await call('DELETE', `/wedding/guests/${x._id}`, { token: t });

  console.log('Messages and safety');
  const ct = other.data.token; // a fresh customer, so the thread starts empty on every run
  const conv = await call('POST', '/conversations', { token: ct, body: { vendor: myVendor._id } });
  ok('customer opens chat with vendor', conv.status === 201);
  const cid = conv.data.conversation._id;
  ok('customer sends message', (await call('POST', `/conversations/${cid}/messages`, { token: ct, body: { text: 'Smoke hello, are you free?' } })).status === 201);
  const flagged = await call('POST', `/conversations/${cid}/messages`, { token: vendor, body: { text: 'Call me on 98765 43210' } });
  ok('vendor reply with phone number is delivered with a note', flagged.status === 201 && flagged.data.note && !flagged.data.message.flags);
  ok('vendor sees the chat', (await call('GET', '/conversations', { token: vendor })).data.conversations.some((c) => c._id === cid));
  ok('customer reads messages', (await call('GET', `/conversations/${cid}/messages`, { token: ct })).data.messages.length >= 2);
  ok('outsider cannot read chat -> 403', (await call('GET', `/conversations/${cid}/messages`, { token: t })).status === 403);
  ok('admin cannot use participant chat API -> 403', (await call('GET', `/conversations/${cid}/messages`, { token: admin })).status === 403);
  ok('admin opening needs a reason -> 400', (await call('POST', `/admin/safety/conversations/${cid}/open`, { token: admin, body: {} })).status === 400);
  const flaggedOnly = await call('POST', `/admin/safety/conversations/${cid}/open`, { token: admin, body: { reason: 'Auto-flag check' } });
  ok('unreported chat: admin sees flagged messages only', flaggedOnly.data.scope === 'flagged-only' && flaggedOnly.data.messages.length === 1);
  ok('report chat', (await call('POST', `/conversations/${cid}/report`, { token: ct, body: { reason: 'Vendor wants payment outside KnotNest' } })).status === 200);
  const full = await call('POST', `/admin/safety/conversations/${cid}/open`, { token: admin, body: { reason: 'Reviewing report' } });
  ok('reported chat: admin sees full thread', full.data.scope === 'full' && full.data.messages.length >= 2);
  ok('admin access is in the audit log', (await call('GET', '/admin/audit', { token: admin })).data.logs.some((l) => String(l.targetId) === cid));
  ok('admin resolves report', (await call('PUT', `/admin/safety/conversations/${cid}/resolve`, { token: admin, body: { resolution: 'Warned vendor' } })).data.conversation.report.status === 'resolved');
  ok('admin enquiry list hides message text', (await call('GET', '/admin/enquiries', { token: admin })).data.enquiries.every((e) => e.message === undefined));
  ok('admin cannot open unreported enquiry -> 403', (await call('POST', `/admin/safety/enquiries/${enq.data.enquiry._id}/open`, { token: admin, body: { reason: 'Just curious' } })).status === 403);
  ok('report enquiry', (await call('POST', `/enquiries/${enq.data.enquiry._id}/report`, { token: vendor, body: { reason: 'Spam enquiry' } })).status === 200);
  ok('admin opens reported enquiry', (await call('POST', `/admin/safety/enquiries/${enq.data.enquiry._id}/open`, { token: admin, body: { reason: 'Reviewing report' } })).data.enquiry.message);
  ok('GET /admin/safety', (await call('GET', '/admin/safety', { token: admin })).data.counts);

  console.log('Vendor');
  ok('GET /vendors/me/analytics', (await call('GET', '/vendors/me/analytics', { token: vendor })).data.totals?.bookings >= 1);
  ok('PUT /vendors/:id (own profile)', (await call('PUT', `/vendors/${myVendor._id}`, { token: vendor, body: { services: myVendor.services, startingPrice: myVendor.startingPrice } })).status === 200);
  ok('vendor cannot self-approve (status ignored)', (await call('PUT', `/vendors/${myVendor._id}`, { token: vendor, body: { status: 'suspended', featured: true } })).data.vendor.status === 'approved');
  ok('GET /reviews (vendor scope)', (await call('GET', '/reviews', { token: vendor })).data.reviews.length > 0);
  ok('vendor blocked from admin API -> 403', (await call('GET', '/admin/dashboard', { token: vendor })).status === 403);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData(); fd.append('files', new Blob([png], { type: 'image/png' }), 'x.png');
  const up = await call('POST', '/uploads/portfolio', { token: vendor, form: fd });
  ok('upload image', up.status === 201 && up.data.urls[0].startsWith('/uploads/'));
  const bad = new FormData(); bad.append('files', new Blob(['hi'], { type: 'text/plain' }), 'x.txt');
  ok('upload non-image rejected', (await call('POST', '/uploads/portfolio', { token: vendor, form: bad })).status === 400);

  console.log('Admin');
  const a = admin;
  const dash = await call('GET', '/admin/dashboard', { token: a });
  ok('GET /admin/dashboard', dash.status === 200 && dash.data.totals.totalUsers > 0 && dash.data.growth.length === 6);
  const rep = await call('GET', '/admin/reports', { token: a });
  ok('GET /admin/reports (with earnings)', rep.status === 200 && typeof rep.data.earnings?.commission === 'number');
  ok('GET /admin/users', (await call('GET', '/admin/users?limit=5', { token: a })).data.users.length > 0);
  ok('GET /admin/vendors', (await call('GET', '/admin/vendors?status=pending', { token: a })).status === 200);
  ok('GET /admin/bookings', (await call('GET', '/admin/bookings', { token: a })).data.bookings.length > 0);
  ok('GET /admin/enquiries', (await call('GET', '/admin/enquiries', { token: a })).data.enquiries.length > 0);
  ok('GET /admin/content', (await call('GET', '/admin/content', { token: a })).data.content.hero);
  ok('GET /admin/messages', (await call('GET', '/admin/messages', { token: a })).status === 200);
  ok('customer blocked from admin API -> 403', (await call('GET', '/admin/users', { token: t })).status === 403);
  const nv = await call('POST', '/vendors', { token: a, body: { businessName: 'Smoke Admin Vendor', category: cats.data.categories[0]._id, city: 'Goa', startingPrice: 12345 } });
  ok('admin adds vendor', nv.status === 201);
  const nid = nv.data.vendor._id;
  ok('admin edits vendor', (await call('PUT', `/vendors/${nid}`, { token: a, body: { startingPrice: 999 } })).data.vendor.startingPrice === 999);
  for (const action of ['verify', 'feature', 'suspend', 'approve']) ok(`admin ${action} vendor`, (await call('PUT', `/admin/vendors/${nid}/moderate`, { token: a, body: { action } })).status === 200);
  ok('admin deletes vendor', (await call('DELETE', `/vendors/${nid}`, { token: a })).status === 200);
  const cat = await call('POST', '/categories', { token: a, body: { name: `Smoke Cat ${Date.now()}` } });
  ok('admin adds category', cat.status === 201);
  ok('admin edits category', (await call('PUT', `/categories/${cat.data.category._id}`, { token: a, body: { status: 'inactive' } })).data.category.status === 'inactive');
  ok('admin deletes category', (await call('DELETE', `/categories/${cat.data.category._id}`, { token: a })).status === 200);
  const loc = await call('POST', '/locations', { token: a, body: { city: `SmokeCity${Date.now()}`, state: 'Test' } });
  ok('admin adds + deletes location', loc.status === 201 && (await call('DELETE', `/locations/${loc.data.location._id}`, { token: a })).status === 200);
  const rv = (await call('GET', '/reviews', { token: a })).data.reviews[0];
  ok('admin hides + republishes review', (await call('PUT', `/reviews/${rv._id}`, { token: a, body: { status: 'hidden' } })).status === 200 && (await call('PUT', `/reviews/${rv._id}`, { token: a, body: { status: 'published' } })).status === 200);
  const content = (await call('GET', '/admin/content', { token: a })).data.content;
  ok('admin saves homepage content', (await call('PUT', '/admin/content', { token: a, body: { google: content.google } })).status === 200);
  const found = (await call('GET', `/admin/users?search=${encodeURIComponent(email)}`, { token: a })).data.users;
  const newUser = found.find((u) => u.email === email);
  const newVendorUser = found.find((u) => u.email === `v_${email}`);
  ok('admin suspends user', (await call('PUT', `/admin/users/${newUser._id}`, { token: a, body: { isActive: false } })).data.user.isActive === false);
  ok('suspended user cannot log in -> 403', (await call('POST', '/auth/login', { body: { email, password: 'Smoke@123' } })).status === 403);
  ok('admin deletes user', (await call('DELETE', `/admin/users/${newUser._id}`, { token: a })).status === 200);
  ok('admin deletes vendor user + their profile', (await call('DELETE', `/admin/users/${newVendorUser._id}`, { token: a })).status === 200 && (await call('GET', '/admin/vendors?search=' + encodeURIComponent(bizName), { token: a })).data.total === 0);

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) { console.log('Failed:', fails.join('; ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
