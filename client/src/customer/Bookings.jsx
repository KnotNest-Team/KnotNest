import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { bookingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Async, EmptyState } from '../components/States';
import PayAdvanceButton from '../components/PayAdvanceButton';
import BookingTimeline from '../components/BookingTimeline';
import { daysSummary, eventsSummary } from '../components/BookingDays';
import PriceBreakdown, { BookingAlerts } from '../components/PriceBreakdown';
import { CalendarPlus } from 'lucide-react';
import { TYPE_LABEL } from '../utils/pricing';

import { statusLabel, statusTone } from '../utils/bookingStatus';
import { errMsg, fmtDate, imgUrl, inr } from '../utils/format';

/** Bookings made in one checkout (several vendors at once) are shown together. */
const groupByCheckout = (list) => {
  const out = [];
  for (const b of list) {
    const last = out.at(-1);
    if (b.checkout && last?.checkout === b.checkout) last.items.push(b);
    else out.push({ checkout: b.checkout || '', items: [b] });
  }
  return out;
};

export default function Bookings() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const state = useFetch(() => bookingApi.list({ status, limit: 50 }), [status]);
  const [busy, setBusy] = useState('');

  const OPEN = ['pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer', 'confirmed'];
  const act = async (id, next, msg) => {
    setBusy(id + next);
    try { await bookingApi.update(id, { status: next }); toast.success(msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const cancel = (id) => window.confirm('Cancel this booking?') && act(id, 'cancelled', 'Booking cancelled');
  const TABS = [['', 'All'], ['awaiting_customer', 'Ready to confirm'], ['pending_review', 'KnotNest reviewing'], ['requested', 'With vendor'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];

  return (
    <>
      <PageHeader title="My Bookings" subtitle="Every request is checked by KnotNest before it reaches the vendor, and every reply before it reaches you." action={<Button icon={CalendarPlus} to="/customer/book">Plan & book</Button>} />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([s, label]) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm transition ${status === s ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10 hover:ring-maroon'}`}>{label}</button>
        ))}
      </div>
      <Async state={state} isEmpty={(d) => !d.bookings.length} empty={<EmptyState title="No bookings here" message="Request a booking from a vendor's profile." action={<Button to="/vendors">Browse vendors</Button>} />}>
        {({ bookings }) => (
          <div className="grid gap-4">
            {groupByCheckout(bookings).map((g) => (
              <div key={g.checkout || g.items[0]._id} className={g.items.length > 1 ? 'grid gap-3 rounded-3xl border border-dashed border-gold/50 bg-gold/5 p-3' : 'grid gap-4'}>
                {g.items.length > 1 && <p className="px-2 pt-1 text-sm text-[#8a6330]">Booked together · {g.items.length} vendors · total <b>{inr(g.items.reduce((t, b) => t + (b.amount || 0), 0))}</b></p>}
            {g.items.map((b) => (
              <article key={b._id} className={`rounded-2xl border bg-white p-5 shadow-card ${b.status === 'awaiting_customer' ? 'border-gold/60' : 'border-ink/10'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <img src={imgUrl(b.vendor?.images?.[0])} alt="" className="h-24 w-full rounded-xl object-cover sm:w-32" />
                <div className="min-w-0 flex-1">
                  <Link to={`/vendors/${b.vendor?._id}`} className="font-display text-2xl text-ink hover:text-maroon">{b.vendor?.businessName}</Link>
                  <p className="mt-1 text-sm text-muted">{eventsSummary(b) || b.eventType} · {daysSummary(b)}{b.packageName && !(b.days?.length > 1) && ` · ${b.packageName} package`}{b.bookingType && b.bookingType !== 'legacy' && <Badge tone="gray" className="ml-2 normal-case">{TYPE_LABEL[b.bookingType]}</Badge>}</p>
                  <p className="mt-1 text-sm text-ink-2">{['pending_review', 'requested'].includes(b.status) ? 'Quoted price' : 'Booking value'} <b>{inr(b.amount)}</b>{b.pricing?.totalDiscount > 0 && <span className="ml-2 text-emerald-700">you save {inr(b.pricing.totalDiscount + (b.pricing.packageSavings || 0))}</span>}</p>
                  <BookingAlerts booking={b} />
                  {b.status === 'awaiting_customer' && <p className="mt-1 text-sm text-[#8a6330]">{b.vendor?.businessName} can do your date. Confirm to lock it in.</p>}
                  {['awaiting_customer', 'confirmed', 'cancelled'].includes(b.status) && b.vendorNote && <p className="mt-2 rounded-lg bg-ivory px-3 py-2 text-sm"><b className="font-medium text-maroon">Vendor: </b>{b.vendorNote}</p>}
                  {b.adminNote && b.status !== 'pending_review' && <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm"><b className="font-medium text-[#8a6330]">KnotNest: </b>{b.adminNote}</p>}
                  {b.advancePaid && <p className="mt-1 text-sm text-emerald-700">Advance of {inr(b.advanceAmount)} paid on {fmtDate(b.advancePaidAt)}</p>}
                  {b.status === 'confirmed' && !b.advancePaid && <p className="mt-1 text-sm text-amber-700">Confirmed. Pay the advance to lock in your date.</p>}
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="flex gap-1.5"><Badge tone={statusTone(b.status)} className="normal-case">{statusLabel(b.status)}</Badge>{b.advancePaid && <Badge tone="green">advance paid</Badge>}</div>
                  {b.status === 'awaiting_customer' && <Button size="sm" loading={busy === b._id + 'confirmed'} onClick={() => act(b._id, 'confirmed', 'Booking confirmed. Pay the advance to lock your date.')}>Confirm booking</Button>}
                  {b.status === 'confirmed' && !b.advancePaid && <PayAdvanceButton booking={b} onPaid={state.reload} />}
                  {OPEN.includes(b.status) && <Button size="sm" variant="ghost" loading={busy === b._id + 'cancelled'} onClick={() => cancel(b._id)}>Cancel</Button>}
                  {b.status === 'completed' && <Button size="sm" to="/customer/reviews">Write review</Button>}
                </div>
              </div>
              {(b.pricing?.version >= 2 || b.days?.length > 1) && (
                <details className="mt-4 border-t border-ink/10 pt-3" open={b.status === 'awaiting_customer'}>
                  <summary className="cursor-pointer text-sm text-maroon">{b.pricing?.version >= 2 ? 'Events and price breakdown' : 'Days and prices'}</summary>
                  <div className="mt-3 max-w-2xl"><PriceBreakdown booking={b} /></div>
                </details>
              )}
              {b.history?.length > 0 && (
                <details className="mt-3 border-t border-ink/10 pt-3">
                  <summary className="cursor-pointer text-sm text-maroon">Booking timeline</summary>
                  <div className="mt-3"><BookingTimeline history={b.history.map((h) => (h.status === 'requested' && h.by === 'admin' ? { ...h, note: '' } : h))} /></div>
                </details>
              )}
              </article>
            ))}
              </div>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
