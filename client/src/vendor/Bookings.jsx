import { useState } from 'react';
import useFetch from '../hooks/useFetch';
import { bookingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import BookingTimeline from '../components/BookingTimeline';
import BookingDays, { daysSummary, eventsSummary } from '../components/BookingDays';
import PriceBreakdown, { BookingAlerts } from '../components/PriceBreakdown';
import { MODE_LABEL, TYPE_LABEL, dayTitle, ymd } from '../utils/pricing';
import { Input, Textarea } from '../components/Field';
import { EmptyState, ErrorState, Loader } from '../components/States';
import { statusLabel, statusTone } from '../utils/bookingStatus';
import { errMsg, fmtDate, inr } from '../utils/format';

const TABS = [['', 'All'], ['requested', 'New requests'], ['vendor_accepted', 'Accepted'], ['awaiting_customer', 'Waiting for couple'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];

/** Accept (optionally with a different price) or decline, with a note. KnotNest reviews it before the couple sees it. */
function Respond({ booking, mode, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState(booking.amount);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const accept = mode === 'accept';
  const send = async () => {
    setBusy(true);
    try {
      await bookingApi.update(booking._id, { status: accept ? 'vendor_accepted' : 'vendor_declined', note, ...(accept && { amount: Number(amount) || 0 }) });
      toast.success(accept ? 'Accepted. Your date is held while KnotNest passes it to the couple.' : 'Declined. KnotNest will let the couple know.');
      onDone(); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={accept ? 'Accept this booking' : 'Decline this booking'} subtitle={`${booking.customer?.name} · ${daysSummary(booking)} · ${booking.eventType}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={accept ? 'primary' : 'danger'} loading={busy} onClick={send}>{accept ? (booking.days?.length > 1 ? `Accept and hold ${booking.days.length} days` : 'Accept and hold the date') : 'Decline'}</Button></>}>
      <div className="grid gap-4">
        <BookingDays booking={booking} />
        {booking.pricing?.version >= 2 && <details className="rounded-xl bg-white p-3 ring-1 ring-ink/10"><summary className="cursor-pointer text-sm text-maroon">Price breakdown sent to the couple</summary><div className="mt-3"><PriceBreakdown booking={booking} compact showDays={false} /></div></details>}
        {accept && <Input label={booking.days?.length > 1 ? 'Total price for all days (₹)' : 'Price (₹)'} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} hint={Number(amount) !== booking.amount ? 'A changed price is always reviewed by KnotNest before the couple sees it.' : `Listed price${booking.days?.length > 1 ? ` for all ${booking.days.length} days` : ` for ${booking.packageName || 'this booking'}`}.`} />}
        <Textarea label={accept ? 'Message for the couple (optional)' : 'Reason (helps KnotNest suggest alternatives)'} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={accept ? 'e.g. Includes a pre-wedding consultation call' : 'e.g. Our team is at another wedding that week'} />
      </div>
    </Modal>
  );
}

const VIEWS = [['wedding', 'Wedding'], ['date', 'Date'], ['event', 'Event'], ['customer', 'Customer'], ['status', 'Status'], ['table', 'Table']];

/** One line per event (or per day for whole-date bookings) so the vendor can read a day's schedule. */
const eventRows = (bookings) => bookings.flatMap((b) => {
  const days = b.days?.length ? b.days : [{ date: b.weddingDate, mode: 'date', events: [] }];
  return days.flatMap((d) => (d.events?.length ? d.events.map((e) => ({ b, d, e })) : [{ b, d, e: null }]));
});

export default function VendorBookings() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [view, setView] = useState('wedding');
  const state = useFetch(() => bookingApi.list({ status, limit: 100 }), [status]);
  const [busy, setBusy] = useState('');
  const [respond, setRespond] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const act = async (id, s, msg) => {
    setBusy(id + s);
    try { await bookingApi.update(id, { status: s }); toast.success(msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const Actions = ({ r }) => (
    <div className="flex flex-wrap justify-end gap-2">
      {r.status === 'requested' && <><Button size="sm" onClick={() => setRespond({ booking: r, mode: 'accept' })}>Accept</Button><Button size="sm" variant="secondary" onClick={() => setRespond({ booking: r, mode: 'decline' })}>Decline</Button></>}
      {r.status === 'confirmed' && <Button size="sm" loading={busy === r._id + 'completed'} onClick={() => act(r._id, 'completed', 'Marked completed')}>Complete</Button>}
      {['vendor_accepted', 'awaiting_customer', 'confirmed'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => window.confirm('Cancel this booking? The couple will be told.') && act(r._id, 'cancelled', 'Booking cancelled')}>Cancel</Button>}
    </div>
  );
  const StatusCell = ({ r }) => <div className="flex flex-col items-start gap-1"><Badge tone={statusTone(r.status)} className="normal-case">{statusLabel(r.status, 'vendor')}</Badge>{r.advancePaid && <Badge tone="green">advance {inr(r.advanceAmount)}</Badge>}
    {r.history?.length > 0 && <button className="text-xs text-maroon underline" onClick={() => setTimeline(r)}>Timeline</button>}</div>;

  /** A booking with all its days and events (same booking = same request, even across several events). */
  const BookingCard = ({ r, showCustomer = true }) => (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {showCustomer && <p className="font-medium text-ink">{r.customer?.name} <span className="text-xs font-normal text-muted">{r.customer?.email}{r.customer?.phone && ` · ${r.customer.phone}`}</span></p>}
          <p className="text-sm text-ink-2">{daysSummary(r)} · {eventsSummary(r) || r.eventType}{r.bookingType && r.bookingType !== 'legacy' && <Badge tone="gray" className="ml-2 normal-case">{TYPE_LABEL[r.bookingType]}</Badge>}</p>
          <p className="mt-0.5 text-sm">Booking value <b className="text-maroon">{inr(r.amount)}</b>{r.pricing?.totalDiscount > 0 && <span className="text-xs text-muted"> (after {inr(r.pricing.totalDiscount)} KnotNest discounts)</span>}</p>
        </div>
        <StatusCell r={r} />
      </div>
      <BookingDays booking={r} compact />
      <BookingAlerts booking={r} />
      {(r.notes || r.adminNoteVendor) && <div className="mt-2 text-sm">{r.notes && <p className="text-ink-2"><b className="font-medium text-ink">Couple: </b>{r.notes}</p>}{r.adminNoteVendor && <p className="mt-1 text-xs text-[#8a6330]">KnotNest: {r.adminNoteVendor}</p>}</div>}
      <div className="mt-3"><Actions r={r} /></div>
    </article>
  );

  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const list = state.data?.bookings || [];
  const groups = (keyOf, labelOf, sortKey = (k) => k) => {
    const m = new Map();
    for (const r of list) { const k = keyOf(r); if (!m.has(k)) m.set(k, { label: labelOf(r), items: [] }); m.get(k).items.push(r); }
    return [...m.entries()].sort(([a], [b]) => String(sortKey(a)).localeCompare(String(sortKey(b)))).map(([k, v]) => ({ key: k, ...v }));
  };
  const rowGroups = (keyOf, labelOf) => {
    const m = new Map();
    for (const row of eventRows(list)) { const k = keyOf(row); if (!m.has(k)) m.set(k, { label: labelOf(row), rows: [] }); m.get(k).rows.push(row); }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, ...v, rows: v.rows.sort((x, y) => ymd(x.d.date).localeCompare(ymd(y.d.date)) || (x.e?.start ?? 0) - (y.e?.start ?? 0)) }));
  };
  const RowList = ({ rows, show }) => (
    <ul className="divide-y divide-ink/5">
      {rows.map(({ b, d, e }, i) => (
        <li key={b._id + i} className="flex flex-wrap items-center gap-3 py-2.5">
          <div className="min-w-[180px] flex-1 text-sm">
            <p className="text-ink">{show === 'date' ? <>{e ? <b className="font-medium">{e.name}</b> : <b className="font-medium">{d.eventName || 'Whole date'}</b>}{e?.time && <span className="text-muted"> · {e.time}</span>}</> : <><b className="font-medium">{dayTitle(d.date)}</b>{e?.time && <span className="text-muted"> · {e.time}</span>}</>}</p>
            <p className="text-xs text-muted">{b.customer?.name} · {MODE_LABEL[d.mode] || 'Whole date'}{e && ` · ${inr(e.price)}`}{(b.days?.length || 1) > 1 || (d.events?.length || 0) > 1 ? ` · part of a booking for ${eventsSummary(b) || daysSummary(b)}` : ''}</p>
          </div>
          <Badge tone={statusTone(b.status)} className="normal-case">{statusLabel(b.status, 'vendor')}</Badge>
          <Actions r={b} />
        </li>
      ))}
    </ul>
  );

  let body;
  if (state.loading) body = <Loader />;
  else if (!list.length) body = <EmptyState title="No bookings here" />;
  else if (view === 'table') {
    body = (
      <Table rows={list} empty={<EmptyState title="No bookings here" />} columns={[
        { key: 'c', header: 'Customer', render: (r) => <div><p className="font-medium text-ink">{r.customer?.name}</p><p className="text-xs text-muted">{r.customer?.email}{r.customer?.phone && ` · ${r.customer.phone}`}</p></div> },
        { key: 'd', header: 'Dates', render: (r) => <div className="min-w-[220px]">{daysSummary(r)}<p className="text-xs text-muted">{eventsSummary(r) || r.eventType}{r.packageName && !(r.days?.length > 1) && ` · ${r.packageName}`}</p><BookingDays booking={r} compact /></div> },
        { key: 'a', header: 'Amount', render: (r) => inr(r.amount) },
        { key: 'n', header: 'Notes', className: 'max-w-[220px]', render: (r) => <div className="text-sm">{r.notes ? <p className="line-clamp-2">{r.notes}</p> : '-'}{r.adminNoteVendor && <p className="mt-1 text-xs text-[#8a6330]">KnotNest: {r.adminNoteVendor}</p>}</div> },
        { key: 's', header: 'Status', render: (r) => <StatusCell r={r} /> },
        { key: 'x', header: '', className: 'text-right', render: (r) => <Actions r={r} /> },
      ]} />
    );
  } else if (view === 'date' || view === 'event') {
    const gs = view === 'date'
      ? rowGroups(({ d }) => ymd(d.date), ({ d }) => dayTitle(d.date))
      : rowGroups(({ d, e }) => (e?.name || d.eventName || 'Whole-date bookings').toLowerCase(), ({ d, e }) => e?.name || d.eventName || 'Whole-date bookings');
    body = <div className="grid gap-4">{gs.map((g) => <section key={g.key} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-card"><h3 className="font-display text-2xl text-ink">{g.label} <span className="text-sm text-muted">· {g.rows.length}</span></h3><RowList rows={g.rows} show={view} /></section>)}</div>;
  } else {
    const gs = view === 'wedding' ? groups((r) => String(r.wedding || r.customer?._id), (r) => `${r.customer?.name || 'Couple'}'s wedding`)
      : view === 'customer' ? groups((r) => String(r.customer?._id), (r) => r.customer?.name || 'Couple')
        : groups((r) => r.status, (r) => statusLabel(r.status, 'vendor'));
    body = (
      <div className="grid gap-5">
        {gs.map((g) => (
          <section key={g.key} className="rounded-3xl bg-ivory/60 p-3 ring-1 ring-ink/5">
            <h3 className="mb-2 px-1 font-display text-2xl text-ink">{g.label} <span className="text-sm text-muted">· {g.items.length} {g.items.length === 1 ? 'booking' : 'bookings'} · {inr(g.items.filter((x) => x.status !== 'cancelled').reduce((t, x) => t + x.amount, 0))}</span></h3>
            <div className="grid gap-3">{g.items.map((r) => <BookingCard key={r._id} r={r} showCustomer={view !== 'customer' && view !== 'wedding'} />)}</div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Bookings" subtitle="KnotNest checks every request before it reaches you, and passes your reply to the couple. Events booked together stay together in one booking." />
      <div className="mb-3 flex flex-wrap gap-2">{TABS.map(([s, label]) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm ${status === s ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10'}`}>{label}</button>)}</div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-2">Group by
        <div className="inline-flex flex-wrap rounded-full bg-white p-1 ring-1 ring-ink/10">{VIEWS.map(([v, label]) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-full px-3 py-1 text-xs ${view === v ? 'bg-maroon text-ivory' : 'text-ink-2 hover:text-maroon'}`}>{label}</button>)}</div>
      </div>
      {body}
      {respond && <Respond {...respond} onClose={() => setRespond(null)} onDone={state.reload} />}
      <Modal open={!!timeline} onClose={() => setTimeline(null)} title="Booking timeline" subtitle={timeline && `${timeline.customer?.name} · ${fmtDate(timeline.weddingDate)}`}>
        {timeline && <BookingTimeline history={timeline.history.filter((h) => h.status !== 'pending_review').map((h) => (h.status === 'awaiting_customer' ? { ...h, note: '' } : h))} />}
      </Modal>
    </>
  );
}
