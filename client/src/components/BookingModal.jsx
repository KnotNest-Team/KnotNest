import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Info, X, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import AvailabilityCalendar from './AvailabilityCalendar';
import DayEventPicker, { NoEventsYet } from './DayEventPicker';
import PriceBreakdown from './PriceBreakdown';
import { Textarea } from './Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { bookingApi } from '../services/api';
import useFetch from '../hooks/useFetch';
import useQuote from '../hooks/useQuote';
import { errMsg, inr } from '../utils/format';
import { dayTitle, selectionToDays } from '../utils/pricing';

/**
 * Request a booking with one vendor. For each wedding day the couple books the entire day (a full-day
 * package) or picks individual events; dates without planned events can still be booked as a whole date.
 * The price on screen is always the server's quote, recalculated on every change.
 */
export default function BookingModal({ vendor, open, onClose, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const isCustomer = user?.role === 'customer';
  const [sel, setSel] = useState({});       // { date: { mode, events } }
  const [extra, setExtra] = useState([]);   // whole dates picked on the calendar
  const [packageName, setPackageName] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState('select');
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [showCal, setShowCal] = useState(false);
  const plan = useFetch(() => bookingApi.plan(), [], { enabled: !!open && isCustomer });
  const planDays = plan.data?.days || [];
  const planDates = new Set(planDays.map((d) => d.date));
  const packages = vendor?.packages || [];
  useEffect(() => { if (!open) { setSel({}); setExtra([]); setNotes(''); setStage('select'); setPackageName(''); } }, [open]);

  const days = useMemo(() => [
    ...selectionToDays(sel).map((d) => ({ ...d, ...(packageName && { packageName }) })),
    ...extra.map((date) => ({ date, packageName: packageName || packages[0]?.name || '' })),
  ], [sel, extra, packageName, packages]);
  const body = days.length ? { vendor: vendor._id, days, _n: nonce } : null;
  const quote = useQuote(isCustomer ? body : null);
  const item = quote.data?.items?.[0];
  const final = quote.data?.totals?.final;
  const problems = [...(item?.error ? [item.error] : []), ...(item?.issues || []).map((i) => i.message)];
  const ready = !!days.length && !!item && !item.error && !problems.length && !quote.loading;

  const toggleExtra = (k) => {
    if (planDates.has(k)) return toast.info('That day has planned events. Choose the entire day or its events above.');
    setExtra((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : xs.length + Object.keys(sel).length >= 10 ? (toast.info('One booking can cover up to 10 days'), xs) : [...xs, k]));
  };

  const submit = async () => {
    setBusy(true);
    try {
      await bookingApi.create({ vendor: vendor._id, days, notes, expectedTotal: final });
      toast.success(days.length > 1 ? `One request sent for ${days.length} days. KnotNest will review it first.` : 'Booking requested. KnotNest will review it first.');
      onClose(); onDone?.();
    } catch (e) {
      toast.error(errMsg(e));
      if (e?.response?.status === 409) { setNonce((n) => n + 1); setStage('select'); }
    } finally { setBusy(false); }
  };

  const blocked = !user || !isCustomer;
  const summary = quote.loading ? <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />Updating price…</span>
    : days.length && final !== undefined ? <>{days.length} {days.length === 1 ? 'day' : 'days'} · {item?.pricing?.totalDiscount > 0 && <s className="mr-1 text-muted">{inr(item.pricing.subtotal)}</s>}<b className="text-ink">{inr(final)}</b></> : 'Nothing selected yet';

  return (
    <Modal open={open} onClose={onClose} size="xl" title={stage === 'review' ? 'Review your booking' : 'Request booking'} subtitle={vendor?.businessName}
      footer={!blocked && (stage === 'select' ? <>
        <p className="mr-auto self-center font-sans text-sm text-ink-2">{summary}</p>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!ready} onClick={() => setStage('review')}>Review booking</Button>
      </> : <>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setStage('select')} className="mr-auto">Change selection</Button>
        <Button loading={busy} disabled={!ready} onClick={submit}>Confirm request · {inr(final)}</Button>
      </>)}>
      {blocked ? (
        <div className="py-6 text-center font-sans">
          <p className="text-ink-2">{user ? 'Only customer accounts can book vendors.' : 'Please log in as a customer to book.'}</p>
          {!user && <Button to="/login" state={{ from: loc.pathname }} className="mt-5">Log in</Button>}
        </div>
      ) : stage === 'review' ? (
        <div className="grid gap-5 font-sans md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>{item && <PriceBreakdown item={item} />}</div>
          <div className="grid content-start gap-4">
            <Textarea label="Notes for the vendor" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Guest count, timings, anything special" />
            {item?.notes?.map((n) => <p key={n} className="flex items-start gap-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-[#8a6330]"><Sparkles size={14} className="mt-0.5 shrink-0" />{n}</p>)}
            <p className="flex items-start gap-2 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" /><span>KnotNest checks the request, then the vendor confirms the times. The price above is saved with your booking; the vendor may propose a different total, which KnotNest reviews before you confirm.</span></p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 font-sans lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            {packages.length > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-sm text-ink-2">Pricing
                <select className="kn-input !w-auto !py-1.5" value={packageName} onChange={(e) => setPackageName(e.target.value)}>
                  <option value="">Vendor's price for each event</option>
                  {packages.map((p) => <option key={p.name} value={p.name}>{p.name} package per event: {inr(p.price)}</option>)}
                </select>
              </label>
            )}
            {plan.loading ? <p className="text-sm text-muted">Loading your wedding days…</p>
              : planDays.length ? <DayEventPicker days={planDays} value={sel} onChange={setSel} vendor={vendor} rules={plan.data?.settings?.discounts} fullDayAllowed={plan.data?.settings?.fullDayPackages} unavailable={vendor.unavailableDates} />
                : <NoEventsYet action={<Button size="sm" className="mt-4" to="/customer/wedding">Add events</Button>} />}
            <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
              <button type="button" onClick={() => setShowCal((v) => !v)} className="flex items-center gap-2 text-sm text-maroon"><CalendarPlus size={16} />{showCal ? 'Hide calendar' : 'Book a date without planned events'}</button>
              {showCal && <div className="mt-3"><AvailabilityCalendar unavailable={vendor.unavailableDates} selected={extra} onSelect={toggleExtra} /></div>}
              {extra.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {[...extra].sort().map((d) => <li key={d} className="inline-flex items-center gap-1 rounded-full bg-maroon/10 px-3 py-1 text-xs text-maroon">{dayTitle(d)} · whole date<button type="button" aria-label={`Remove ${d}`} onClick={() => toggleExtra(d)}><X size={13} /></button></li>)}
                </ul>
              )}
            </div>
          </div>
          <aside className="grid content-start gap-3 lg:sticky lg:top-0">
            <h4 className="font-display text-2xl text-ink">Price</h4>
            {!days.length && <p className="text-sm text-muted">Choose an entire day or individual events. Prices and discounts appear here and update as you change your selection.</p>}
            {quote.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{quote.error}</p>}
            {problems.map((m) => <p key={m} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{m}</p>)}
            {item?.notes?.map((n) => <p key={n} className="flex items-start gap-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-[#8a6330]"><Sparkles size={13} className="mt-0.5 shrink-0" />{n}</p>)}
            {item && !item.error && <div className={quote.loading ? 'opacity-60 transition' : 'transition'}><PriceBreakdown item={item} compact /></div>}
          </aside>
        </div>
      )}
    </Modal>
  );
}
