import { useState } from 'react';
import { Eye, EyeOff, Trash2, Lock } from 'lucide-react';
import { statusLabel, statusTone } from '../utils/bookingStatus';
import { daysSummary, eventsSummary } from '../components/BookingDays';
import { TYPE_LABEL } from '../utils/pricing';
import useFetch from '../hooks/useFetch';
import { adminApi, bookingApi, enquiryApi, reviewApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import { Stars } from '../components/StarRating';
import { EmptyState, ErrorState } from '../components/States';
import { errMsg, fmtDate, inr } from '../utils/format';

const Filters = ({ options, value, onChange }) => (
  <div className="mb-5 flex flex-wrap gap-2">{options.map((s) => <button key={s} onClick={() => onChange(s)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${value === s ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10'}`}>{s ? s.replace('_', ' ') : 'All'}</button>)}</div>
);

export function Bookings() {
  const toast = useToast();
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const state = useFetch(() => adminApi.bookings({ status, page, limit: 12 }), [status, page]);
  const set = async (id, s, note) => { try { await bookingApi.update(id, { status: s, note }); toast.success(`Booking ${s}`); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;
  return (
    <>
      <PageHeader title="Bookings" subtitle="Every booking across the platform." />
      <Filters options={['', 'pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer', 'confirmed', 'completed', 'cancelled']} value={status} onChange={(s) => { setStatus(s); setPage(1); }} />
      <Table loading={state.loading} rows={d?.bookings} empty={<EmptyState title="No bookings" />} columns={[
        { key: 'c', header: 'Customer', render: (b) => <div><p className="font-medium text-ink">{b.customer?.name}</p><p className="text-xs text-muted">{b.customer?.email}</p></div> },
        { key: 'v', header: 'Vendor', render: (b) => <div>{b.vendor?.businessName}<p className="text-xs text-muted">{b.vendor?.city}</p></div> },
        { key: 'd', header: 'Dates', render: (b) => <div>{daysSummary(b)}<p className="text-xs text-muted">{eventsSummary(b) || b.eventType}</p>{(b.alerts || []).some((x) => !x.resolved) && <p className="text-xs text-amber-700">Wedding plan changed after booking</p>}</div> },
        { key: 't', header: 'Type', render: (b) => <span className="text-xs text-ink-2">{TYPE_LABEL[b.bookingType || 'legacy']}</span> },
        { key: 'a', header: 'Amount', render: (b) => <div>{inr(b.amount)}{b.pricing?.totalDiscount > 0 && <p className="text-xs text-emerald-700">−{inr(b.pricing.totalDiscount)} discount</p>}</div> }, { key: 's', header: 'Status', render: (b) => <Badge tone={statusTone(b.status)} className="normal-case">{statusLabel(b.status, 'admin')}</Badge> },
        { key: 'x', header: '', className: 'text-right', render: (b) => <div className="flex justify-end gap-2">
          {['pending_review', 'vendor_accepted', 'vendor_declined'].includes(b.status) && <Button size="sm" to="/admin/booking-reviews">Review</Button>}
          {b.status === 'confirmed' && <Button size="sm" onClick={() => set(b._id, 'completed')}>Complete</Button>}
          {['requested', 'awaiting_customer', 'confirmed'].includes(b.status) && <Button size="sm" variant="secondary" onClick={() => { const note = window.prompt('Reason for cancelling (sent to both sides)'); if (note) set(b._id, 'cancelled', note); }}>Cancel</Button>}
        </div> },
      ]} />
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />
    </>
  );
}

export function Enquiries() {
  const toast = useToast();
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const state = useFetch(() => adminApi.enquiries({ status, page, limit: 12 }), [status, page]);
  const set = async (id, s) => { try { await enquiryApi.update(id, { status: s }); toast.success('Enquiry updated'); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;
  return (
    <>
      <PageHeader title="Enquiries" subtitle="Leads sent from couples to vendors. Message text stays private unless someone reports it." />
      <Filters options={['', 'pending', 'contacted', 'accepted', 'rejected', 'converted']} value={status} onChange={(s) => { setStatus(s); setPage(1); }} />
      <Table loading={state.loading} rows={d?.enquiries} empty={<EmptyState title="No enquiries" />} columns={[
        { key: 'c', header: 'From', render: (e) => <div><p className="font-medium text-ink">{e.name}</p><p className="text-xs text-muted">{e.email} · {e.phone}</p></div> },
        { key: 'v', header: 'Vendor', render: (e) => e.vendor?.businessName }, { key: 'e', header: 'Event', render: (e) => <div>{e.eventType}<p className="text-xs text-muted">{e.weddingDate ? fmtDate(e.weddingDate) : '-'}</p></div> },
        { key: 'm', header: 'Message', render: (e) => e.report?.status === 'open' ? <Button size="sm" variant="soft" to="/admin/safety">Reported: review</Button> : <span className="inline-flex items-center gap-1 text-xs text-muted" title="Message text is private between the couple and the vendor"><Lock size={12} />Private</span> },
        { key: 'd', header: 'Received', render: (e) => fmtDate(e.createdAt) },
        { key: 's', header: 'Status', render: (e) => <select aria-label="Change status" className="kn-input !w-32 !py-1.5 capitalize" value={e.status} onChange={(ev) => set(e._id, ev.target.value)}>{['pending', 'contacted', 'accepted', 'rejected', 'converted'].map((s) => <option key={s}>{s}</option>)}</select> },
      ]} />
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />
    </>
  );
}

export function Reviews() {
  const toast = useToast();
  const [f, setF] = useState(''); const [page, setPage] = useState(1);
  const state = useFetch(() => reviewApi.list({ page, limit: 12, ...(f === 'reported' ? { reported: 'true' } : f ? { status: f } : {}) }), [f, page]);
  const run = async (fn, msg) => { try { await fn(); toast.success(msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;
  return (
    <>
      <PageHeader title="Review Moderation" subtitle="Hide or remove reviews that break the community rules. Vendor ratings recalculate automatically." />
      <Filters options={['', 'published', 'hidden', 'reported']} value={f} onChange={(s) => { setF(s); setPage(1); }} />
      <Table loading={state.loading} rows={d?.reviews} empty={<EmptyState title="No reviews" />} columns={[
        { key: 'v', header: 'Vendor', render: (r) => r.vendor?.businessName }, { key: 'c', header: 'Customer', render: (r) => r.customer?.name },
        { key: 'r', header: 'Rating', render: (r) => <Stars value={r.rating} /> }, { key: 't', header: 'Comment', className: 'max-w-[300px]', render: (r) => <span className="line-clamp-2">{r.comment}</span> },
        { key: 'd', header: 'Date', render: (r) => fmtDate(r.createdAt) },
        { key: 's', header: 'Status', render: (r) => <div className="flex flex-col items-start gap-1"><Badge status={r.status} />{r.reported && <Badge tone="red">reported</Badge>}</div> },
        { key: 'a', header: '', className: 'text-right', render: (r) => <div className="flex justify-end">
          <button title={r.status === 'published' ? 'Hide' : 'Publish'} aria-label={r.status === 'published' ? 'Hide review' : 'Publish review'} onClick={() => run(() => reviewApi.moderate(r._id, r.status === 'published' ? 'hidden' : 'published'), r.status === 'published' ? 'Review hidden' : 'Review published')} className="rounded-full p-2 text-muted hover:bg-ink/5">{r.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          <button title="Delete" aria-label="Delete review" onClick={() => window.confirm('Delete this review permanently?') && run(() => reviewApi.remove(r._id), 'Review deleted')} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div> },
      ]} />
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />
    </>
  );
}
