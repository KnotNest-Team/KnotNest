import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Flag, Send, ShieldCheck, MessagesSquare } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Textarea } from '../components/Field';
import { EmptyState, Loader, ErrorState } from '../components/States';
import { errMsg, fmtDate, imgUrl, initials } from '../utils/format';

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function Thread({ id, role, onBack, onActivity }) {
  const toast = useToast();
  const [conv, setConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const endRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setConv(null); setMsgs([]); setError(''); setNote('');
    chatApi.messages(id).then((d) => { if (!alive) return; setConv(d.conversation); setMsgs(d.messages); setNotice(d.notice); lastRef.current = d.messages.at(-1)?.createdAt; onActivity(); })
      .catch((e) => alive && setError(errMsg(e)));
    // poll for new messages every 5 seconds while the thread is open
    const t = setInterval(async () => {
      try {
        const d = await chatApi.messages(id, lastRef.current);
        if (alive && d.messages.length) { setMsgs((m) => [...m, ...d.messages.filter((x) => !m.some((y) => y._id === x._id))]); lastRef.current = d.messages.at(-1).createdAt; onActivity(); }
      } catch { /* keep polling */ }
    }, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [id]); // eslint-disable-line
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const r = await chatApi.send(id, body);
      setMsgs((m) => [...m, r.message]); lastRef.current = r.message.createdAt; setText(''); setNote(r.note || ''); onActivity();
    } catch (e) { toast.error(errMsg(e)); } finally { setSending(false); }
  };
  const report = async () => {
    try { const r = await chatApi.report(id, reason); toast.success(r.message); setReporting(false); setReason(''); } catch (e) { toast.error(errMsg(e)); }
  };

  if (error) return <div className="p-6"><ErrorState message={error} /></div>;
  if (!conv) return <Loader />;
  const otherName = role === 'customer' ? conv.vendor.businessName : conv.customer.name;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
        <button onClick={onBack} className="rounded-full p-1.5 text-muted hover:bg-ink/5 md:hidden" aria-label="Back to conversations"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          {role === 'customer' ? <Link to={`/vendors/${conv.vendor._id}`} className="font-display text-2xl leading-tight text-ink hover:text-maroon">{otherName}</Link> : <p className="font-display text-2xl leading-tight text-ink">{otherName}</p>}
        </div>
        <Button size="sm" variant="ghost" icon={Flag} onClick={() => setReporting(true)}>Report</Button>
      </div>
      <p className="flex items-center gap-2 bg-ivory/70 px-4 py-2 text-xs text-muted"><ShieldCheck size={14} className="shrink-0 text-gold" />{notice}</p>
      <div className="kn-scroll flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hello. Ask about dates, packages and what's included.</p>}
        {msgs.map((m, i) => {
          const mine = m.senderRole === role;
          return (
            <div key={m._id}>
              {(i === 0 || !sameDay(m.createdAt, msgs[i - 1].createdAt)) && <p className="my-3 text-center text-xs text-muted">{fmtDate(m.createdAt)}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-maroon text-ivory' : 'rounded-bl-md bg-white text-ink ring-1 ring-ink/10'}`}>
                  {m.text}<span className={`mt-1 block text-right text-[10px] ${mine ? 'text-ivory/60' : 'text-muted'}`}>{time(m.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {note && <p className="mx-4 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-600/20">{note}</p>}
      <form className="flex items-end gap-2 border-t border-ink/10 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea aria-label={`Message ${otherName}`} className="kn-input max-h-32 min-h-[44px] flex-1 resize-none" rows={1} maxLength={2000} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message" />
        <Button type="submit" icon={Send} loading={sending} disabled={!text.trim()}>Send</Button>
      </form>
      <Modal open={reporting} onClose={() => setReporting(false)} title="Report this conversation" subtitle="Our team will read this chat to investigate. Every review is logged."
        footer={<><Button variant="ghost" onClick={() => setReporting(false)}>Cancel</Button><Button variant="danger" onClick={report} disabled={reason.trim().length < 5}>Send report</Button></>}>
        <Textarea label="What went wrong?" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Asking me to pay outside KnotNest, rude messages, suspected fake business" />
      </Modal>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const role = user.role;
  const [params, setParams] = useSearchParams();
  const active = params.get('c');
  const state = useFetch(() => chatApi.list());
  useEffect(() => { const t = setInterval(() => state.reload(), 15000); return () => clearInterval(t); }, []); // eslint-disable-line
  const select = (id) => setParams(id ? { c: id } : {});

  return (
    <>
      <PageHeader title="Messages" subtitle={role === 'customer' ? 'Talk to vendors before you book. Keep payments on KnotNest so you stay protected.' : 'Reply to couples quickly. Keep bookings and payments on KnotNest.'} />
      {state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : state.loading ? <Loader /> : !state.data.conversations.length ? (
        <EmptyState icon={MessagesSquare} title="No conversations yet" message={role === 'customer' ? 'Open a vendor profile and choose Message to start a conversation.' : 'Couples who message you will appear here.'} action={role === 'customer' && <Button to="/vendors">Browse vendors</Button>} />
      ) : (
        <div className="grid h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card md:grid-cols-[300px_1fr]">
          <ul className={`kn-scroll overflow-y-auto border-r border-ink/10 ${active ? 'hidden md:block' : ''}`}>
            {state.data.conversations.map((c) => {
              const name = role === 'customer' ? c.vendor?.businessName : c.customer?.name;
              const unread = c.unread?.[role] || 0;
              return (
                <li key={c._id}>
                  <button onClick={() => select(c._id)} className={`flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 text-left transition ${active === c._id ? 'bg-maroon/5' : 'hover:bg-ivory/60'}`}>
                    {role === 'customer' && c.vendor?.images?.[0] ? <img src={imgUrl(c.vendor.images[0])} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-maroon text-xs font-medium text-ivory">{initials(name)}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2"><span className={`truncate text-sm ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>{name}</span><span className="shrink-0 text-[11px] text-muted">{fmtDate(c.lastMessageAt, { day: 'numeric', month: 'short' })}</span></span>
                      <span className="flex items-center gap-2"><span className="truncate text-xs text-muted">{c.lastMessage || 'No messages yet'}</span>{unread > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1.5 text-[10px] text-white">{unread}</span>}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={`min-h-0 ${active ? '' : 'hidden md:grid md:place-items-center'}`}>
            {active ? <Thread key={active} id={active} role={role} onBack={() => select(null)} onActivity={() => state.reload()} /> : <p className="text-sm text-muted">Choose a conversation</p>}
          </div>
        </div>
      )}
    </>
  );
}
