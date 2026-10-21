import { useState } from 'react';
import { Flag } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { reviewApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import ReviewCard from '../components/ReviewCard';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Textarea } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { errMsg } from '../utils/format';

export default function VendorReviews() {
  const toast = useToast();
  const state = useFetch(() => reviewApi.list({ limit: 50 }));
  const [sel, setSel] = useState(null);
  const [text, setText] = useState('');
  const send = async () => {
    try { await reviewApi.reply(sel._id, text); toast.success('Reply posted'); setSel(null); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const report = async (r) => {
    if (!window.confirm('Report this review to the KnotNest team for moderation?')) return;
    try { await reviewApi.report(r._id); toast.success('Reported. Our team will review it.'); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <PageHeader title="Reviews" subtitle="Reply publicly to couples, or report anything that breaks the rules." />
      <Async state={state} isEmpty={(d) => !d.reviews.length} empty={<EmptyState title="No reviews yet" message="Reviews appear after a booking is marked completed." />}>
        {({ reviews }) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.map((r) => (
              <div key={r._id}>
                <ReviewCard review={r} />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setSel(r); setText(r.reply || ''); }}>{r.reply ? 'Edit reply' : 'Reply'}</Button>
                  <Button size="sm" variant="ghost" icon={Flag} disabled={r.reported} onClick={() => report(r)}>{r.reported ? 'Reported' : 'Report'}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Async>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Reply to review" footer={<><Button variant="ghost" onClick={() => setSel(null)}>Cancel</Button><Button onClick={send}>Post reply</Button></>}>
        <Textarea label="Your reply" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      </Modal>
    </>
  );
}
