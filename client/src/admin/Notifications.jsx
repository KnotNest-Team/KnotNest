import { Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { NotificationsPage } from '../pages/Shared';
import Card from '../components/Card';
import { fmtDate, errMsg } from '../utils/format';

/** Admin notifications plus the contact-form inbox. */
export default function AdminNotifications() {
  const toast = useToast();
  const msgs = useFetch(() => adminApi.messages());
  const del = async (id) => { try { await adminApi.deleteMessage(id); msgs.reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="grid gap-10">
      <NotificationsPage />
      <section className="max-w-3xl">
        <h2 className="mb-4 font-display text-3xl text-ink">Contact messages</h2>
        {msgs.loading ? null : !msgs.data?.messages.length ? <p className="text-sm text-muted">No messages from the contact form yet.</p> : (
          <div className="grid gap-3">{msgs.data.messages.map((m) => (
            <Card key={m._id}>
              <div className="flex items-start justify-between gap-3"><div className="text-sm"><p className="font-medium text-ink">{m.subject || 'No subject'}</p><p className="text-xs text-muted">{m.name} · <a className="text-maroon" href={`mailto:${m.email}`}>{m.email}</a> · {fmtDate(m.createdAt)}</p><p className="mt-2 text-ink-2">{m.message}</p></div>
                <button onClick={() => del(m._id)} aria-label="Delete message" className="rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div>
            </Card>))}</div>
        )}
      </section>
    </div>
  );
}
