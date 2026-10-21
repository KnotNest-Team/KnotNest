import { useState } from 'react';
import useFetch from '../hooks/useFetch';
import { enquiryApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Textarea } from '../components/Field';
import { EmptyState, ErrorState } from '../components/States';
import ReportModal from '../components/ReportModal';
import { errMsg, fmtDate } from '../utils/format';

const FILTERS = ['', 'pending', 'contacted', 'accepted', 'rejected', 'converted'];

export default function VendorEnquiries() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const state = useFetch(() => enquiryApi.list({ status, limit: 50 }), [status]);
  const [sel, setSel] = useState(null);
  const [reply, setReply] = useState('');
  const [reporting, setReporting] = useState(null);

  const set = async (id, s, response) => {
    try { await enquiryApi.update(id, { status: s, ...(response !== undefined && { response }) }); toast.success(`Marked as ${s}`); setSel(null); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Reply quickly. Couples usually book the vendor who answers first." />
      <div className="mb-5 flex flex-wrap gap-2">{FILTERS.map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10'}`}>{s || 'All'}</button>)}</div>
      <Table loading={state.loading} rows={state.data?.enquiries} empty={<EmptyState title="No enquiries" message="They will appear here when couples contact you." />} columns={[
        { key: 'name', header: 'Couple', render: (r) => <div><p className="font-medium text-ink">{r.name}</p><p className="text-xs text-muted">{r.email} · {r.phone}</p></div> },
        { key: 'event', header: 'Event', render: (r) => <div>{r.eventType}<p className="text-xs text-muted">{r.weddingDate ? fmtDate(r.weddingDate) : 'Date open'}{r.guestCount > 0 && ` · ${r.guestCount} guests`}</p></div> },
        { key: 'status', header: 'Status', render: (r) => <Badge status={r.status} /> },
        { key: 'date', header: 'Received', render: (r) => fmtDate(r.createdAt) },
        { key: 'a', header: '', className: 'text-right', render: (r) => <Button size="sm" variant="secondary" onClick={() => { setSel(r); setReply(r.response || ''); }}>Open</Button> },
      ]} />
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name} subtitle={`${sel?.eventType} · ${sel?.email} · ${sel?.phone}`} size="lg"
        footer={sel && <>
          {sel.report?.status === 'open' ? <span className="mr-auto self-center text-xs text-muted">Reported, under review</span> : <Button variant="ghost" className="mr-auto" onClick={() => setReporting(sel)}>Report</Button>}
          <Button variant="secondary" onClick={() => set(sel._id, 'contacted', reply)}>Mark contacted</Button>
          <Button variant="secondary" onClick={() => set(sel._id, 'converted', reply)}>Converted</Button>
          <Button variant="danger" onClick={() => set(sel._id, 'rejected', reply)}>Reject</Button>
          <Button onClick={() => set(sel._id, 'accepted', reply)}>Accept</Button></>}>
        {sel && <div className="grid gap-4">
          <p className="rounded-xl bg-ivory p-4 font-serif italic text-ink-2">"{sel.message}"</p>
          <Textarea label="Your reply to the couple (shown in their dashboard)" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
        </div>}
      </Modal>
      <ReportModal open={!!reporting} onClose={() => setReporting(null)} title="Report this enquiry" what="this enquiry"
        onSubmit={async (reason) => { const r = await enquiryApi.report(reporting._id, reason); setSel(null); state.reload(); return r; }} />
    </>
  );
}
