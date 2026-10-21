import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, Inbox, Zap, UserCheck } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { adminApi, bookingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import BookingTimeline from '../components/BookingTimeline';
import BookingDays, { daysSummary, eventsSummary } from '../components/BookingDays';
import PriceBreakdown, { BookingAlerts } from '../components/PriceBreakdown';
import { Textarea } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { statusLabel, statusTone } from '../utils/bookingStatus';
import { errMsg, fmtDate, inr } from '../utils/format';

const waited = (h) => (h < 1 ? 'just now' : h < 48 ? `${h} h` : `${Math.round(h / 24)} days`);

/** What the admin can do at each stage, and what the note is for. */
const ACTIONS = {
  pending_review: [
    { next: 'requested', label: 'Approve and send to vendor', title: 'Send to the vendor', noteLabel: 'Note for the vendor (optional)', ok: 'Sent to the vendor' },
    { next: 'cancelled', label: 'Reject', variant: 'secondary', title: 'Reject this request', noteLabel: 'Reason, sent to the couple', required: true, ok: 'Request rejected. The couple was told why.' },
  ],
  vendor_accepted: [
    { next: 'awaiting_customer', label: 'Send offer to couple', title: "Send the vendor's offer to the couple", noteLabel: 'Note for the couple (optional)', ok: 'Offer sent to the couple' },
    { next: 'cancelled', label: 'Cancel', variant: 'secondary', title: 'Cancel this booking', noteLabel: 'Reason, sent to both sides', required: true, ok: 'Booking cancelled and the date released' },
  ],
  vendor_declined: [
    { next: 'cancelled', label: 'Tell the couple', title: 'Let the couple know', noteLabel: 'Message for the couple, e.g. similar vendors to try', ok: 'The couple has been told' },
  ],
};

function Act({ booking, action, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await bookingApi.update(booking._id, { status: action.next, note }); toast.success(action.ok); onDone(); onClose(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={action.title} subtitle={`${booking.customer?.name} and ${booking.vendor?.businessName} · ${daysSummary(booking)}`}
      footer={<><Button variant="ghost" onClick={onClose}>Back</Button><Button variant={action.next === 'cancelled' && booking.status !== 'vendor_declined' ? 'danger' : 'primary'} loading={busy} disabled={action.required && note.trim().length < 5} onClick={go}>{action.label}</Button></>}>
      <Textarea label={action.noteLabel} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

function Settings({ settings, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const save = async (patch, key) => {
    setBusy(key);
    try { const r = await adminApi.updatePlatformSettings(patch); onSaved(r.settings); toast.success('Booking approval updated'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const Opt = ({ value, icon: Icon, title, text }) => {
    const on = settings.bookingApproval === value;
    return (
      <button type="button" aria-pressed={on} disabled={!!busy} onClick={() => !on && save({ bookingApproval: value }, value)}
        className={`flex flex-1 items-start gap-3 rounded-xl p-4 text-left transition ${on ? 'bg-maroon text-ivory' : 'bg-white ring-1 ring-ink/10 hover:ring-maroon'}`}>
        <Icon size={20} className={`mt-0.5 shrink-0 ${on ? 'text-gold-lt' : 'text-maroon'}`} />
        <span><span className="block font-medium">{title}</span><span className={`mt-0.5 block text-sm ${on ? 'text-ivory/80' : 'text-muted'}`}>{text}</span></span>
      </button>
    );
  };
  return (
    <section className="mb-6 rounded-2xl border border-ink/10 bg-cream p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-ink">Booking approval</h2>
        <label className="flex items-center gap-2 text-sm text-ink-2">Review within
          <select className="kn-input !w-auto !py-1.5" value={settings.reviewHours} onChange={(e) => save({ reviewHours: Number(e.target.value) }, 'hours')}>
            {[4, 12, 24, 48].map((h) => <option key={h} value={h}>{h} hours</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <Opt value="manual" icon={UserCheck} title="Manual (managed marketplace)" text="KnotNest reviews every request before the vendor sees it, and every vendor reply before the couple sees it." />
        <Opt value="auto_verified" icon={Zap} title="Automatic for verified vendors" text="Verified vendors skip both reviews. New vendors, price changes and declines still come here." />
      </div>
    </section>
  );
}

export default function BookingReviews() {
  const state = useFetch(() => adminApi.bookingReviews());
  const [act, setAct] = useState(null);
  return (
    <>
      <PageHeader title="Booking reviews" subtitle="KnotNest checks each booking in both directions: the couple's request before it reaches the vendor, and the vendor's reply before it reaches the couple." />
      <Async state={state}>
        {({ bookings, settings }) => {
          const overdue = bookings.filter((b) => b.overdue).length;
          return (
            <>
              <Settings settings={settings} onSaved={(s) => state.setData((d) => ({ ...d, settings: s }))} />
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <DashboardCard label="New requests" icon={Inbox} value={bookings.filter((b) => b.status === 'pending_review').length} hint="Check before the vendor sees them" />
                <DashboardCard label="Vendor replies" icon={CheckCircle2} tone="gold" value={bookings.filter((b) => b.status !== 'pending_review').length} hint="Check before the couple sees them" />
                <DashboardCard label="Over target time" icon={Clock} tone={overdue ? 'amber' : 'green'} value={overdue} hint={`Target: ${settings.reviewHours} hours per review`} />
              </div>
              {!bookings.length ? <EmptyState icon={ShieldCheck} title="All caught up" message="Nothing is waiting for KnotNest right now." /> : (
                <div className="grid gap-4">
                  {bookings.map((b) => (
                    <article key={b._id} className={`rounded-2xl border bg-white p-5 shadow-card ${b.overdue ? 'border-amber-300' : 'border-ink/10'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Badge tone={statusTone(b.status)} className="normal-case">{statusLabel(b.status, 'admin')}</Badge>
                          <h3 className="mt-2 font-display text-2xl text-ink">{b.customer?.name} <span className="text-muted">&rarr;</span> {b.vendor?.businessName}</h3>
                          <p className="text-sm text-muted">{eventsSummary(b) || b.eventType} · {daysSummary(b)}{b.packageName && !(b.days?.length > 1) && ` · ${b.packageName} package`} · {b.vendor?.city}</p>
                        </div>
                        <p className={`flex items-center gap-1.5 text-sm ${b.overdue ? 'font-medium text-amber-700' : 'text-muted'}`}>{b.overdue ? <AlertTriangle size={15} /> : <Clock size={15} />}Waiting {waited(b.waitingHours)}</p>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="grid gap-2 text-sm">
                          <p className="text-ink-2"><b className="font-medium text-ink">Couple: </b>{b.customer?.email}{b.customer?.phone && ` · ${b.customer.phone}`}</p>
                          <p className="text-ink-2"><b className="font-medium text-ink">Amount: </b>{inr(b.amount)}{b.days?.length > 1 && ` for ${b.days.length} days`}</p>
                          {b.pricing?.version >= 2 ? <details><summary className="cursor-pointer text-maroon">Events and price breakdown</summary><div className="mt-2"><PriceBreakdown booking={b} compact /></div></details> : <BookingDays booking={b} compact />}
                          <BookingAlerts booking={b} />
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={b.checks.vendorVerified ? 'green' : 'amber'} className="normal-case">{b.checks.vendorVerified ? 'Verified vendor' : 'Vendor not verified'}</Badge>
                            <Badge tone={b.checks.priceAsListed ? 'green' : 'amber'} className="normal-case">{b.checks.priceAsListed ? (b.pricing?.version >= 2 ? 'Quoted price' : 'Listed price') : `Price changed (quoted ${inr(b.checks.listedPrice)})`}</Badge>
                            {b.checks.discount > 0 && <Badge tone="gold" className="normal-case">Discount {inr(b.checks.discount)}</Badge>}
                            {b.checks.calendarFree === false && <Badge tone="red" className="normal-case">Vendor busy: {b.checks.calendarNote}</Badge>}
                            {b.checks.calendarFree === true && <Badge tone="green" className="normal-case">Vendor calendar free</Badge>}
                          </div>
                          {b.notes && <p className="rounded-lg bg-ivory px-3 py-2"><b className="font-medium text-ink">Couple's note: </b>{b.notes}</p>}
                          {b.vendorNote && <p className="rounded-lg bg-maroon/5 px-3 py-2"><b className="font-medium text-maroon">Vendor: </b>{b.vendorNote}</p>}
                        </div>
                        <div><p className="kn-label">Timeline</p><BookingTimeline history={b.history} compact /></div>
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4">
                        {(ACTIONS[b.status] || []).map((a) => <Button key={a.next} size="sm" variant={a.variant || 'primary'} onClick={() => setAct({ booking: b, action: a })}>{a.label}</Button>)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </Async>
      {act && <Act {...act} onClose={() => setAct(null)} onDone={state.reload} />}
    </>
  );
}
