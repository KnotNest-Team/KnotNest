import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Check, Loader2, Search, Sparkles, Star, Trash2, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import DayEventPicker, { NoEventsYet } from '../components/DayEventPicker';
import PriceBreakdown from '../components/PriceBreakdown';
import { Textarea } from '../components/Field';
import { Async } from '../components/States';
import useFetch from '../hooks/useFetch';
import useQuote from '../hooks/useQuote';
import { bookingApi, categoryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, imgUrl, inr } from '../utils/format';
import { dayShort, dayTitle, selectionToDays, store } from '../utils/pricing';

const STEPS = ['Wedding days', 'Events & booking type', 'Vendors', 'Review & confirm'];

/**
 * Booking planner: pick wedding days, book each one entirely or event by event, choose vendors per category
 * (the same vendor for everything or a different one per event) and confirm everything in one checkout.
 * The draft survives a page refresh; every price shown is the server's quote.
 */
export default function BookWedding() {
  const plan = useFetch(() => bookingApi.plan());
  return (
    <>
      <PageHeader title="Plan & book" subtitle="Book whole wedding days at a package rate, or only the events you need, across as many days and vendors as you like. Prices update as you go." />
      <Async state={plan}>{(data) => (data.days.length ? <Planner data={data} /> : <NoEventsYet action={<Button size="sm" className="mt-4" to="/customer/wedding">Add events</Button>} />)}</Async>
    </>
  );
}

function Planner({ data }) {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const KEY = `knotnest_book_draft_${user?._id}`;
  const days = data.days;
  const eventInfo = useMemo(() => Object.fromEntries(days.flatMap((d) => d.events.map((e) => [e._id, { ...e, date: d.date }]))), [days]);

  // ---- draft (restored after a refresh; anything no longer in the plan is dropped) ----
  const [saved] = useState(() => store.get(KEY, {}));
  const [step, setStep] = useState(saved.step || 0);
  const [dates, setDates] = useState((saved.dates || []).filter((d) => days.some((x) => x.date === d)));
  const [sel, setSel] = useState(() => Object.fromEntries(Object.entries(saved.sel || {}).filter(([d]) => days.some((x) => x.date === d))
    .map(([d, v]) => [d, v.mode === 'events' ? { ...v, events: v.events.filter((id) => eventInfo[id]?.date === d) } : v])));
  const [assign, setAssign] = useState(saved.assign || {}); // { category: { eventId: { _id, businessName } } }
  const [notes, setNotes] = useState(saved.notes || '');
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => { store.set(KEY, { step, dates, sel, assign, notes }); }, [KEY, step, dates, sel, assign, notes]);

  // events currently selected (full day = every event that day)
  const selected = useMemo(() => {
    const out = [];
    for (const [date, v] of Object.entries(sel)) {
      if (!dates.includes(date)) continue;
      const ids = v.mode === 'full_day' ? (days.find((d) => d.date === date)?.events || []).map((e) => e._id) : v.events;
      for (const id of ids) if (eventInfo[id]) out.push(id);
    }
    return out;
  }, [sel, dates, days, eventInfo]);

  // drop vendor choices for events that were removed from the selection
  useEffect(() => {
    setAssign((a) => {
      let changed = false;
      const next = Object.fromEntries(Object.entries(a).map(([cat, m]) => [cat, Object.fromEntries(Object.entries(m).filter(([id]) => { const keep = selected.includes(id); if (!keep) changed = true; return keep; }))]).filter(([, m]) => Object.keys(m).length));
      return changed || Object.keys(next).length !== Object.keys(a).length ? next : a;
    });
  }, [selected]);

  // checkout items: one per vendor; a vendor with every event of a full-day date books that day as a package
  const items = useMemo(() => {
    const byVendor = {};
    for (const m of Object.values(assign)) for (const [id, v] of Object.entries(m)) {
      const date = eventInfo[id]?.date;
      if (!date) continue;
      ((byVendor[v._id] ||= {})[date] ||= new Set()).add(id);
    }
    return Object.entries(byVendor).map(([vendor, perDay]) => ({
      vendor,
      days: Object.entries(perDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, set]) => {
        const all = (days.find((d) => d.date === date)?.events || []).map((e) => e._id);
        return sel[date]?.mode === 'full_day' && all.every((id) => set.has(id)) ? { date, mode: 'full_day' } : { date, mode: 'events', events: [...set] };
      }),
    }));
  }, [assign, eventInfo, days, sel]);
  const quote = useQuote(items.length ? { items, _n: nonce } : null);
  const q = quote.data;
  const problems = (q?.items || []).flatMap((x) => [...(x.error ? [`${x.vendor.businessName}: ${x.error}`] : []), ...x.issues.map((i) => `${x.vendor.businessName}: ${i.message}`)]);

  const pickDates = (d) => {
    setDates((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));
    setSel((s) => {
      if (s[d]) { const n = { ...s }; delete n[d]; return n; }
      const evs = days.find((x) => x.date === d)?.events || [];
      return { ...s, [d]: evs.length > 1 && data.settings.fullDayPackages ? { mode: 'full_day', events: [] } : { mode: 'events', events: evs.map((e) => e._id) } };
    });
  };
  const daySel = (next) => {
    setSel(next);
    setDates((ds) => [...new Set([...ds.filter((d) => next[d]), ...Object.keys(next)])].sort());
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await bookingApi.checkout({ items, notes, expectedTotal: q.totals.final });
      store.del(KEY);
      toast.success(`${r.bookings.length} booking ${r.bookings.length === 1 ? 'request' : 'requests'} sent. KnotNest will review ${r.bookings.length === 1 ? 'it' : 'them'} first.`);
      nav('/customer/bookings');
    } catch (e) {
      toast.error(errMsg(e));
      setNonce((n) => n + 1);
    } finally { setBusy(false); }
  };
  const reset = () => { if (window.confirm('Start over? Your selection will be cleared.')) { setDates([]); setSel({}); setAssign({}); setNotes(''); setStep(0); } };

  const canNext = [dates.length > 0, selected.length > 0, items.length > 0 && !!q && !problems.length && !quote.loading, false][step];

  return (
    <div className="grid gap-6 font-sans xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" onClick={() => i <= step && setStep(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition ${i === step ? 'bg-maroon text-ivory' : i < step ? 'bg-white text-maroon ring-1 ring-maroon/30' : 'bg-white/60 text-muted ring-1 ring-ink/10'}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${i === step ? 'bg-ivory text-maroon' : i < step ? 'bg-maroon text-ivory' : 'bg-ink/10'}`}>{i < step ? <Check size={12} /> : i + 1}</span>{s}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section>
            <h2 className="font-display text-3xl text-ink">Which wedding days do you want to book?</h2>
            <p className="mt-1 text-sm text-muted">Each day shows its events. You can book a whole day or pick events next.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {days.map((d) => {
                const on = dates.includes(d.date);
                return (
                  <button key={d.date} type="button" onClick={() => pickDates(d.date)} aria-pressed={on}
                    className={`rounded-2xl p-4 text-left transition ${on ? 'bg-maroon text-ivory shadow-card' : 'bg-white ring-1 ring-ink/10 hover:ring-maroon/50'}`}>
                    <span className="flex items-center justify-between"><span className="font-display text-2xl">{dayTitle(d.date)}</span>{on && <Check size={18} />}</span>
                    <span className={`mt-1 block text-sm ${on ? 'text-ivory/80' : 'text-muted'}`}>{d.events.map((e) => `${e.name}${e.time ? ` · ${e.time}` : ''}`).join('  |  ')}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="font-display text-3xl text-ink">Book entire days or individual events</h2>
            <p className="mb-4 mt-1 text-sm text-muted">"Book entire day" includes every event of that day as a package. "Select events" lets you leave some out.</p>
            <DayEventPicker days={days.filter((d) => dates.includes(d.date))} value={sel} onChange={daySel} rules={data.settings.discounts} fullDayAllowed={data.settings.fullDayPackages} />
          </section>
        )}

        {step === 2 && <VendorStep days={days} sel={sel} dates={dates} selected={selected} eventInfo={eventInfo} assign={assign} setAssign={setAssign} />}

        {step === 3 && (
          <section className="grid gap-5">
            <h2 className="font-display text-3xl text-ink">Check everything before you confirm</h2>
            {!q && quote.loading && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={15} className="animate-spin" />Getting your final price…</p>}
            {q?.items.map((x) => (
              <article key={x.vendor._id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
                <header className="mb-3 flex flex-wrap items-center gap-3">
                  {x.vendor.images?.[0] && <img src={imgUrl(x.vendor.images[0])} alt="" className="h-12 w-16 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1"><h3 className="font-display text-2xl text-ink">{x.vendor.businessName}</h3><p className="text-xs text-muted">{x.vendor.city}</p></div>
                  {x.pricing && <p className="font-display text-2xl text-maroon">{inr(x.pricing.final)}</p>}
                </header>
                {x.error ? <p className="text-sm text-red-700">{x.error}</p> : <PriceBreakdown item={x} />}
                {x.notes?.map((n) => <p key={n} className="mt-2 flex items-start gap-2 text-xs text-[#8a6330]"><Sparkles size={13} className="mt-0.5 shrink-0" />{n}</p>)}
              </article>
            ))}
            <Textarea label="Notes for your vendors" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Guest count, venue details, anything special" />
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
          {step > 0 && <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(step - 1)}>Back</Button>}
          <button type="button" onClick={reset} className="text-sm text-muted underline hover:text-maroon">Start over</button>
          <span className="ml-auto" />
          {step < 3 ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></Button>
            : <Button loading={busy} disabled={!q || !!problems.length || quote.loading} onClick={submit}>Send {items.length > 1 ? `${items.length} booking requests` : 'booking request'} · {q ? inr(q.totals.final) : '…'}</Button>}
        </div>
      </div>

      <Summary q={q} loading={quote.loading} error={quote.error} problems={problems} dates={dates} sel={sel} selected={selected} days={days} priorBookings={data.priorBookings} />
    </div>
  );
}

/** Step 3: choose a category, see which vendors are free for the selection and at what price, assign them. */
function VendorStep({ days, sel, dates, selected, eventInfo, assign, setAssign }) {
  const cats = useFetch(() => categoryApi.list());
  const [category, setCategory] = useState(Object.keys(assign)[0] || '');
  const [perEvent, setPerEvent] = useState(false);
  const reqDays = selectionToDays(Object.fromEntries(Object.entries(sel).filter(([d]) => dates.includes(d))));
  const key = JSON.stringify([category, reqDays]);
  const found = useFetch(() => (category ? bookingApi.availableVendors({ category, days: reqDays, checkoutDays: dates.length }) : Promise.resolve(null)), [key]);
  const mine = assign[category] || {};
  const setFor = (ids, v) => setAssign((a) => ({ ...a, [category]: { ...(a[category] || {}), ...Object.fromEntries(ids.map((id) => [id, v])) } }));
  const clearCat = (cat) => setAssign((a) => { const n = { ...a }; delete n[cat]; return n; });
  const unset = (id) => setAssign((a) => { const m = { ...(a[category] || {}) }; delete m[id]; const n = { ...a, [category]: m }; if (!Object.keys(m).length) delete n[category]; return n; });

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="font-display text-3xl text-ink">Choose vendors</h2>
        <p className="mt-1 text-sm text-muted">Pick a service, then a vendor for all your selected events, or a different vendor per event. Only vendors free at those times can be chosen for everything.</p>
      </div>
      {Object.keys(assign).length > 0 && (
        <ul className="grid gap-2">
          {Object.entries(assign).map(([cat, m]) => {
            const byV = {};
            for (const [id, v] of Object.entries(m)) (byV[v.businessName] ||= []).push(eventInfo[id]);
            return (
              <li key={cat} className="flex flex-wrap items-start gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-ink/10">
                <button type="button" onClick={() => setCategory(cat)} className="font-medium text-ink hover:text-maroon">{cat}</button>
                <span className="flex-1 text-sm text-ink-2">{Object.entries(byV).map(([name, evs]) => `${name}: ${evs.filter(Boolean).map((e) => `${e.name} (${dayShort(e.date)})`).join(', ')}`).join(' · ')}</span>
                <button type="button" onClick={() => clearCat(cat)} className="rounded-full p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${cat}`}><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1"><span className="kn-label">Service</span>
          <select className="kn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Choose a service…</option>
            {(cats.data?.categories || []).filter((c) => c.vendorCount > 0).map((c) => <option key={c._id} value={c.name}>{c.name}{assign[c.name] ? ' ✓' : ''}</option>)}
          </select>
        </label>
        {category && <label className="flex items-center gap-2 pb-2 text-sm text-ink-2"><input type="checkbox" className="accent-[#6E1E2A]" checked={perEvent} onChange={(e) => setPerEvent(e.target.checked)} />Different vendor per event</label>}
      </div>

      {category && found.loading && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={15} className="animate-spin" />Checking who is free…</p>}
      {category && found.error && <p className="text-sm text-red-700">{found.error}</p>}
      {category && found.data && !perEvent && (
        found.data.vendors.length === 0 ? <p className="text-sm text-muted">No {category.toLowerCase()} listed yet.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {found.data.vendors.map((r) => {
              const covered = r.days.flatMap((d) => d.events.map((e) => String(e.event)));
              const chosen = covered.length > 0 && covered.every((id) => mine[id]?._id === r.vendor._id);
              return (
                <article key={r.vendor._id} className={`rounded-2xl border bg-white p-4 shadow-card ${chosen ? 'border-maroon' : 'border-ink/10'} ${r.available ? '' : 'opacity-70'}`}>
                  <div className="flex gap-3">
                    {r.vendor.images?.[0] && <img src={imgUrl(r.vendor.images[0])} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 font-display text-xl text-ink">{r.vendor.businessName}{r.vendor.verified && <BadgeCheck size={16} className="text-gold" />}</h3>
                      <p className="flex items-center gap-2 text-xs text-muted">{r.vendor.city}{r.vendor.rating > 0 && <span className="inline-flex items-center gap-0.5"><Star size={11} className="fill-gold text-gold" />{r.vendor.rating.toFixed(1)}</span>}</p>
                    </div>
                  </div>
                  {r.pricing ? (
                    <p className="mt-3 text-sm text-ink-2">{covered.length} {covered.length === 1 ? 'event' : 'events'}: {r.pricing.totalDiscount > 0 && <s className="text-muted">{inr(r.pricing.subtotal)}</s>} <b className="font-display text-xl text-maroon">{inr(r.pricing.final)}</b>
                      {r.pricing.discounts.filter((d) => d.amount).length > 0 && <span className="block text-xs text-[#8a6330]">{r.pricing.discounts.filter((d) => d.amount).map((d) => `${d.label} −${inr(d.amount)}`).join(' · ')}</span>}</p>
                  ) : null}
                  {r.issues.map((m) => <p key={m} className="mt-2 flex items-start gap-1.5 text-xs text-red-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{m}</p>)}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chosen ? <Button size="sm" variant="secondary" onClick={() => clearCat(category)}>Remove</Button>
                      : <Button size="sm" disabled={!r.available} onClick={() => setFor(covered, { _id: r.vendor._id, businessName: r.vendor.businessName })}>Book for {covered.length === selected.length ? 'all selected events' : `${covered.length} events`}</Button>}
                    <Button size="sm" variant="ghost" to={`/vendors/${r.vendor._id}`} target="_blank">Profile</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}
      {category && found.data && perEvent && (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {days.filter((d) => dates.includes(d.date)).map((d) => {
            const ids = d.events.map((e) => e._id).filter((id) => selected.includes(id));
            if (!ids.length) return null;
            return (
              <div key={d.date} className="border-b border-ink/10 p-4 last:border-0">
                <p className="mb-2 font-medium text-ink">{dayTitle(d.date)} <span className="text-xs font-normal text-muted">· {sel[d.date]?.mode === 'full_day' ? 'Entire day (one vendor for every event keeps the package rate)' : 'Selected events'}</span></p>
                <ul className="grid gap-2">
                  {ids.map((id) => (
                    <li key={id} className="flex flex-wrap items-center gap-3">
                      <span className="w-40 text-sm text-ink">{eventInfo[id].name}<span className="block text-xs text-muted">{eventInfo[id].time}</span></span>
                      <select className="kn-input !w-auto flex-1 !py-1.5" value={mine[id]?._id || ''} onChange={(e) => { const v = found.data.vendors.find((x) => x.vendor._id === e.target.value); if (v) setFor([id], { _id: v.vendor._id, businessName: v.vendor.businessName }); else unset(id); }}>
                        <option value="">No {category.toLowerCase()} for this event</option>
                        {found.data.vendors.map((r) => <option key={r.vendor._id} value={r.vendor._id}>{r.vendor.businessName}{r.vendor.city ? ` · ${r.vendor.city}` : ''}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="flex items-center gap-2 bg-ivory px-4 py-2 text-xs text-muted"><Users size={13} />Each vendor is checked for that event's date and time when the price updates.</p>
        </div>
      )}
      {!category && !Object.keys(assign).length && <p className="flex items-center gap-2 text-sm text-muted"><Search size={15} />Start with the service you need most, for example Photographers or Decorators.</p>}
    </section>
  );
}

/** Live summary: dates, events by day, vendors, discounts and the final amount (all from the server's quote). */
function Summary({ q, loading, error, problems, dates, sel, selected, days, priorBookings }) {
  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
        <h3 className="flex items-center justify-between font-display text-2xl text-ink">Your booking {loading && <Loader2 size={16} className="animate-spin text-muted" />}</h3>
        {!dates.length ? <p className="mt-2 text-sm text-muted">Pick your wedding days to start.</p> : (
          <ul className="mt-3 grid gap-2 text-sm">
            {dates.map((d) => {
              const v = sel[d]; const day = days.find((x) => x.date === d);
              const names = v?.mode === 'full_day' ? day?.events.map((e) => e.name) : day?.events.filter((e) => v?.events?.includes(e._id)).map((e) => e.name);
              return <li key={d}><b className="font-medium text-ink">{dayShort(d)}</b> <span className="text-xs text-muted">· {v?.mode === 'full_day' ? 'Entire day' : `${names?.length || 0} selected`}</span><span className="block text-ink-2">{names?.join(', ') || 'No events selected'}</span></li>;
            })}
          </ul>
        )}
        {q && (
          <div className="mt-4 grid gap-2 border-t border-ink/10 pt-3 text-sm">
            {q.items.map((x) => (
              <div key={x.vendor._id} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-ink-2"><span className="text-ink">{x.vendor.businessName}</span><span className="block text-xs text-muted">{x.days.map((d) => `${dayShort(d.date)}: ${d.mode === 'full_day' ? 'entire day' : d.events.map((e) => e.name).join(', ')}`).join(' · ')}</span></span>
                <span className="shrink-0 text-ink">{x.pricing ? inr(x.pricing.final) : '-'}</span>
              </div>
            ))}
            <div className="mt-1 grid gap-1 border-t border-ink/10 pt-2">
              <p className="flex justify-between text-ink-2"><span>Subtotal ({q.totals.events} {q.totals.events === 1 ? 'event' : 'events'})</span><span>{inr(q.totals.subtotal)}</span></p>
              {q.totals.packageSavings > 0 && <p className="flex justify-between text-ink-2"><span>Full-day package prices</span><span>−{inr(q.totals.packageSavings)}</span></p>}
              {q.items.flatMap((x) => x.pricing?.discounts || []).filter((d) => d.amount).length > 0 && (
                <ul className="text-xs text-[#8a6330]">
                  {Object.entries(q.items.flatMap((x) => x.pricing?.discounts || []).filter((d) => d.amount).reduce((m, d) => ({ ...m, [d.label]: (m[d.label] || 0) + d.amount }), {})).map(([label, amt]) => <li key={label} className="flex justify-between"><span>{label}</span><span>−{inr(amt)}</span></li>)}
                </ul>
              )}
              <p className="flex justify-between text-ink-2"><span>Total discount</span><span>−{inr(q.totals.discount)}</span></p>
              <p className="flex items-baseline justify-between border-t border-ink/10 pt-2"><span className="font-medium text-ink">Final payable</span><span className="font-display text-3xl text-maroon">{inr(q.totals.final)}</span></p>
            </div>
          </div>
        )}
        {!q && selected.length > 0 && <p className="mt-3 border-t border-ink/10 pt-3 text-sm text-muted">Choose vendors to see prices.</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {problems.map((m) => <p key={m} className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{m}</p>)}
        {priorBookings > 0 && <p className="mt-3 text-xs text-emerald-700">Welcome back: you have {priorBookings} confirmed {priorBookings === 1 ? 'booking' : 'bookings'}, so a returning-couple discount can apply.</p>}
      </div>
    </aside>
  );
}
