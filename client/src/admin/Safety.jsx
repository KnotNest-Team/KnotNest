import { useState } from 'react';
import { ShieldAlert, Flag, MessageSquareWarning, ScrollText, Lock } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { Input, Textarea } from '../components/Field';
import { EmptyState, ErrorState } from '../components/States';
import { errMsg, fmtDate } from '../utils/format';

const FLAG_LABEL = { phone: 'phone number', email: 'email', upi: 'UPI ID', link: 'link', abuse: 'abusive language' };
const ACTION = { view_conversation: 'Opened reported chat', view_flagged_messages: 'Viewed flagged messages', view_enquiry: 'Opened reported enquiry', resolve_report: 'Resolved report' };
const stamp = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Step 1: give a reason (logged). Step 2: read what the rules allow, then resolve. */
function Review({ item, kind, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState(kind === 'flagged' ? 'Checking auto-flagged messages' : 'Reviewing user report');
  const [data, setData] = useState(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const isEnquiry = kind === 'enquiry';
  const open = async () => {
    setBusy(true);
    try { setData(isEnquiry ? await adminApi.openEnquiry(item._id, reason) : await adminApi.openConversation(item._id, reason)); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const resolve = async () => {
    setBusy(true);
    try { await (isEnquiry ? adminApi.resolveEnquiry(item._id, resolution) : adminApi.resolveConversation(item._id, resolution)); toast.success('Report resolved. The reporter has been notified.'); onDone(); onClose(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const canResolve = (item.report?.status === 'open');
  const title = `${item.customer?.name || 'Customer'} and ${item.vendor?.businessName || 'vendor'}`;
  return (
    <Modal open onClose={onClose} size="lg" title={title} subtitle={item.report?.status === 'open' ? `Reported ${fmtDate(item.report.at)} by ${item.report.by?.name || 'a participant'}` : 'Auto-flagged conversation'}
      footer={!data ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Lock} loading={busy} disabled={reason.trim().length < 5} onClick={open}>Open and log access</Button></>
        : canResolve ? <><Button variant="ghost" onClick={onClose}>Close</Button><Button loading={busy} onClick={resolve}>Resolve report</Button></> : <Button onClick={onClose}>Close</Button>}>
      {!data ? (
        <div className="grid gap-4">
          <p className="flex items-start gap-2 rounded-xl bg-ivory p-3 text-sm text-ink-2"><Lock size={16} className="mt-0.5 shrink-0 text-gold" />
            {kind === 'flagged' ? 'This chat was not reported. You will see only the messages that were automatically flagged, not the whole conversation.' : 'This was reported by a participant, so the full content can be reviewed.'} Your name, the time and the reason are saved in the audit log.</p>
          <Input label="Reason for opening" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      ) : (
        <div className="grid gap-4">
          {item.report?.reason && <p className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-800"><b className="font-medium">Report: </b>{item.report.reason}</p>}
          {isEnquiry ? (
            <div className="rounded-xl bg-ivory p-4 text-sm"><p className="text-xs text-muted">{data.enquiry.name} · {data.enquiry.email} · {data.enquiry.phone}</p><p className="mt-2 font-serif italic text-ink-2">"{data.enquiry.message}"</p>{data.enquiry.response && <p className="mt-3"><b className="text-maroon">Vendor: </b>{data.enquiry.response}</p>}</div>
          ) : (
            <div className="kn-scroll max-h-[45vh] space-y-2 overflow-y-auto rounded-xl bg-ivory/60 p-3">
              {data.scope === 'flagged-only' && <p className="text-center text-xs text-muted">Showing flagged messages only</p>}
              {data.messages.length === 0 && <p className="py-6 text-center text-sm text-muted">No messages</p>}
              {data.messages.map((m) => (
                <div key={m._id} className={`flex ${m.senderRole === 'vendor' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.senderRole === 'vendor' ? 'bg-maroon/10' : 'bg-white ring-1 ring-ink/10'}`}>
                    <p className="text-[11px] text-muted">{m.senderRole === 'vendor' ? data.conversation.vendor?.businessName : data.conversation.customer?.name} · {stamp(m.createdAt)}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-ink">{m.text}</p>
                    {m.flags?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{m.flags.map((f) => <Badge key={f} tone="red">{FLAG_LABEL[f]}</Badge>)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canResolve && <Textarea label="Resolution (sent to the person who reported)" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="e.g. We have warned the vendor. Please keep payments on KnotNest." />}
        </div>
      )}
    </Modal>
  );
}

export default function Safety() {
  const [tab, setTab] = useState('reported');
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(null);
  const state = useFetch(() => (tab === 'audit' ? adminApi.audit({ page }) : adminApi.safety({ filter: tab, page })), [tab, page]);
  const counts = useFetch(() => adminApi.safety({ filter: 'reported', limit: 1 }), [review]);
  const c = counts.data?.counts || {};
  const TABS = [['reported', 'Reported chats'], ['flagged', 'Auto-flagged chats'], ['resolved', 'Resolved'], ['audit', 'Audit log']];
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;

  return (
    <>
      <PageHeader title="Safety" subtitle="Chats and enquiries are private. Admins can read them only after a report, or see just the auto-flagged messages. Every access is logged." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Open chat reports" icon={ShieldAlert} value={c.reported ?? '-'} tone="maroon" />
        <DashboardCard label="Auto-flagged chats" icon={MessageSquareWarning} value={c.flagged ?? '-'} tone="amber" hint="Phone numbers, UPI IDs, links, abuse" />
        <DashboardCard label="Reported enquiries" icon={Flag} value={c.enquiries ?? '-'} tone="gold" />
      </div>
      {counts.data?.reportedEnquiries?.length > 0 && tab === 'reported' && (
        <div className="mb-6">
          <h2 className="mb-3 font-display text-2xl text-ink">Reported enquiries</h2>
          <Table rows={counts.data.reportedEnquiries} columns={[
            { key: 'c', header: 'Couple', render: (e) => e.customer?.name }, { key: 'v', header: 'Vendor', render: (e) => e.vendor?.businessName },
            { key: 'd', header: 'Reported', render: (e) => fmtDate(e.report?.at) },
            { key: 'a', header: '', className: 'text-right', render: (e) => <Button size="sm" variant="secondary" onClick={() => setReview({ item: e, kind: 'enquiry' })}>Review</Button> },
          ]} />
        </div>
      )}
      <div className="mb-5 flex flex-wrap gap-2">{TABS.map(([k, label]) => <button key={k} onClick={() => { setTab(k); setPage(1); }} className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10'}`}>{label}</button>)}</div>
      {tab === 'audit' ? (
        <Table loading={state.loading} rows={d?.logs} empty={<EmptyState icon={ScrollText} title="No access yet" message="When an admin opens a reported chat or enquiry it is recorded here." />} columns={[
          { key: 't', header: 'When', render: (l) => stamp(l.createdAt) }, { key: 'a', header: 'Admin', render: (l) => l.admin?.name },
          { key: 'x', header: 'Action', render: (l) => ACTION[l.action] || l.action }, { key: 'k', header: 'Item', render: (l) => <span className="capitalize">{l.targetType}</span> },
          { key: 'r', header: 'Reason', className: 'max-w-[280px]', render: (l) => <span className="line-clamp-2">{l.reason}</span> },
        ]} />
      ) : (
        <Table loading={state.loading} rows={d?.conversations} empty={<EmptyState icon={ShieldAlert} title={tab === 'reported' ? 'No open reports' : tab === 'flagged' ? 'Nothing flagged' : 'No resolved reports'} />} columns={[
          { key: 'c', header: 'Couple', render: (r) => <div><p className="font-medium text-ink">{r.customer?.name}</p><p className="text-xs text-muted">{r.customer?.email}</p></div> },
          { key: 'v', header: 'Vendor', render: (r) => <div>{r.vendor?.businessName}<p className="text-xs text-muted">{r.vendor?.city}</p></div> },
          { key: 'f', header: 'Flags', render: (r) => r.flaggedCount ? <Badge tone="amber">{r.flaggedCount} flagged</Badge> : '-' },
          { key: 'r', header: 'Report', render: (r) => r.report?.status === 'none' ? <span className="text-xs text-muted">Not reported</span> : <div className="flex flex-col items-start gap-1"><Badge status={r.report.status} /><span className="text-xs text-muted">{fmtDate(r.report.at)}</span></div> },
          { key: 'l', header: 'Last activity', render: (r) => fmtDate(r.lastMessageAt) },
          { key: 'a', header: '', className: 'text-right', render: (r) => <Button size="sm" variant="secondary" onClick={() => setReview({ item: r, kind: tab === 'flagged' ? 'flagged' : 'conversation' })}>{tab === 'flagged' ? 'View flags' : 'Review'}</Button> },
        ]} />
      )}
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />
      {review && <Review {...review} onClose={() => setReview(null)} onDone={() => { state.reload(); counts.reload(); }} />}
    </>
  );
}
