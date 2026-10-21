import { useState } from 'react';
import useFetch from '../hooks/useFetch';
import { bookingApi, reviewApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ReviewCard from '../components/ReviewCard';
import ImageUploader from '../components/ImageUploader';
import { Textarea } from '../components/Field';
import { StarInput } from '../components/StarRating';
import { Async, EmptyState } from '../components/States';
import { errMsg, fmtDate } from '../utils/format';

export default function Reviews() {
  const toast = useToast();
  const state = useFetch(async () => {
    const [b, r] = await Promise.all([bookingApi.list({ status: 'completed', limit: 100 }), reviewApi.list({ limit: 100 })]);
    return { bookings: b.bookings, reviews: r.reviews };
  });
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ rating: 5, comment: '', images: [] });
  const [busy, setBusy] = useState(false);

  const open = (b) => { setForm({ rating: 5, comment: '', images: [] }); setTarget(b); };
  const submit = async () => {
    if (form.comment.trim().length < 3) return toast.error('Please write a short comment');
    setBusy(true);
    try { await reviewApi.create({ booking: target._id, ...form }); toast.success('Thanks for your review!'); setTarget(null); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Reviews" subtitle="Share your experience once a booking is completed." />
      <Async state={state}>
        {({ bookings, reviews }) => {
          const reviewed = new Set(reviews.map((r) => String(r.booking)));
          const pending = bookings.filter((b) => !reviewed.has(String(b._id)));
          return (
            <div className="grid gap-8">
              <Card title="Waiting for your review">
                {pending.length === 0 ? <p className="text-sm text-muted">You're all caught up. Reviews unlock after a vendor marks a booking as completed.</p> : (
                  <ul className="divide-y divide-ink/10">{pending.map((b) => (
                    <li key={b._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-ink">{b.vendor?.businessName}</p><p className="text-sm text-muted">{b.eventType} · {fmtDate(b.weddingDate)}</p></div><Button size="sm" onClick={() => open(b)}>Write review</Button></li>
                  ))}</ul>
                )}
              </Card>
              <section>
                <h2 className="mb-4 font-display text-3xl text-ink">Your reviews</h2>
                {reviews.length === 0 ? <EmptyState title="No reviews yet" /> : <div className="grid gap-4 lg:grid-cols-2">{reviews.map((r) => (<div key={r._id}><p className="mb-1 text-sm font-medium text-ink">{r.vendor?.businessName}</p><ReviewCard review={{ ...r, customer: r.customer }} /></div>))}</div>}
              </section>
            </div>
          );
        }}
      </Async>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Write a review" subtitle={target?.vendor?.businessName} footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button loading={busy} onClick={submit}>Submit review</Button></>}>
        <div className="grid gap-5">
          <div><span className="kn-label">Your rating</span><StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></div>
          <Textarea label="Your experience" rows={5} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <ImageUploader kind="review" multiple max={4} label="Photos (optional)" value={form.images} onChange={(images) => setForm({ ...form, images })} />
        </div>
      </Modal>
    </>
  );
}
