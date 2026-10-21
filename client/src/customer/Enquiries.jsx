import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import ReportModal from '../components/ReportModal';
import useFetch from '../hooks/useFetch';
import { enquiryApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Async, EmptyState } from '../components/States';
import { fmtDate, imgUrl } from '../utils/format';

export default function Enquiries() {
  const state = useFetch(() => enquiryApi.list({ limit: 50 }));
  const [reporting, setReporting] = useState(null);
  return (
    <>
      <PageHeader title="My Enquiries" subtitle="Track every conversation with vendors." action={<Button to="/vendors" variant="secondary">Find vendors</Button>} />
      <Async state={state} isEmpty={(d) => !d.enquiries.length} empty={<EmptyState title="No enquiries yet" message="Send an enquiry from any vendor profile." action={<Button to="/vendors">Browse vendors</Button>} />}>
        {({ enquiries }) => (
          <div className="grid gap-4">
            {enquiries.map((e) => (
              <article key={e._id} className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-card sm:flex-row">
                <img src={imgUrl(e.vendor?.images?.[0])} alt="" className="h-24 w-full rounded-xl object-cover sm:w-32" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/vendors/${e.vendor?._id}`} className="font-display text-2xl text-ink hover:text-maroon">{e.vendor?.businessName}</Link>
                    <Badge status={e.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{e.eventType}{e.weddingDate && ` · ${fmtDate(e.weddingDate)}`}{e.guestCount > 0 && ` · ${e.guestCount} guests`} · sent {fmtDate(e.createdAt)}</p>
                  <p className="mt-2 font-serif italic text-ink-2">"{e.message}"</p>
                  {e.response && <p className="mt-3 rounded-lg bg-ivory p-3 text-sm"><b className="text-maroon">Vendor: </b>{e.response}</p>}
                  <div className="mt-3 flex justify-end">{e.report?.status === 'open' ? <span className="text-xs text-muted">Reported, under review</span>
                    : <button onClick={() => setReporting(e)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-600"><Flag size={12} />Report</button>}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Async>
      <ReportModal open={!!reporting} onClose={() => setReporting(null)} title="Report this enquiry" what="this enquiry"
        onSubmit={async (reason) => { const r = await enquiryApi.report(reporting._id, reason); state.reload(); return r; }} />
    </>
  );
}
