import { useState } from 'react';
import { BadgeCheck, Ban, Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { adminApi, vendorApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import VendorForm from './VendorForm';
import { ErrorState, EmptyState } from '../components/States';
import { errMsg, imgUrl, inr } from '../utils/format';

const IconBtn = ({ title, onClick, children, tone = '' }) => <button title={title} aria-label={title} onClick={onClick} className={`rounded-full p-2 text-muted transition hover:bg-ink/5 ${tone}`}>{children}</button>;

export default function AdminVendors({ pendingOnly = false }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [status, setStatus] = useState(pendingOnly ? 'pending' : '');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | {} (new) | vendor
  const state = useFetch(() => adminApi.vendors({ search: dq, status: pendingOnly ? 'pending' : status, page, limit: 10, sort: 'newest' }), [dq, status, page, pendingOnly]);

  const act = async (id, action, msg) => { try { await adminApi.moderateVendor(id, action); toast.success(msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  const del = async (v) => {
    if (!window.confirm(`Permanently delete ${v.businessName}? This cannot be undone.`)) return;
    try { await vendorApi.remove(v._id); toast.success('Vendor deleted'); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;

  return (
    <>
      <PageHeader title={pendingOnly ? 'Vendor Approvals' : 'Vendors'} subtitle={pendingOnly ? 'New registrations waiting for review.' : 'Add, edit, approve, verify, feature or suspend vendors.'}
        action={!pendingOnly && <Button icon={Plus} onClick={() => setForm({})}>Add vendor</Button>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchBar className="flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search vendors" />
        {!pendingOnly && <select aria-label="Filter by status" className="kn-input !w-full sm:!w-44 !rounded-full" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{['pending', 'approved', 'rejected', 'suspended'].map((s) => <option key={s} value={s}>{s}</option>)}</select>}
      </div>
      <Table loading={state.loading} rows={d?.vendors} empty={<EmptyState title={pendingOnly ? 'No pending approvals' : 'No vendors found'} />} columns={[
        { key: 'b', header: 'Vendor', render: (v) => <div className="flex items-center gap-3"><img src={imgUrl(v.images?.[0])} alt="" className="h-11 w-11 rounded-lg object-cover bg-ivory-2" /><div><p className="font-medium text-ink">{v.businessName}{v.verified && <BadgeCheck size={14} className="ml-1 inline text-emerald-600" />}{v.featured && <Star size={13} className="ml-1 inline fill-gold text-gold" />}</p><p className="text-xs text-muted">{v.ownerName} · {v.email}</p></div></div> },
        { key: 'c', header: 'Category', render: (v) => v.category?.name },
        { key: 'l', header: 'City', render: (v) => v.city || '-' },
        { key: 'p', header: 'From', render: (v) => inr(v.startingPrice) },
        { key: 'r', header: 'Rating', render: (v) => (v.reviewCount ? `${v.rating} (${v.reviewCount})` : '-') },
        { key: 's', header: 'Status', render: (v) => <Badge status={v.status} /> },
        { key: 'a', header: 'Actions', className: 'text-right', render: (v) => (
          <div className="flex justify-end">
            {v.status !== 'approved' && <IconBtn title="Approve" tone="hover:!text-emerald-600" onClick={() => act(v._id, 'approve', 'Vendor approved')}><Check size={17} /></IconBtn>}
            {v.status === 'pending' && <IconBtn title="Reject" tone="hover:!text-red-600" onClick={() => act(v._id, 'reject', 'Vendor rejected')}><X size={17} /></IconBtn>}
            {v.status === 'approved' && <IconBtn title="Suspend" tone="hover:!text-red-600" onClick={() => act(v._id, 'suspend', 'Vendor suspended')}><Ban size={16} /></IconBtn>}
            <IconBtn title={v.verified ? 'Remove verification' : 'Verify'} tone={v.verified ? '!text-emerald-600' : ''} onClick={() => act(v._id, v.verified ? 'unverify' : 'verify', v.verified ? 'Verification removed' : 'Vendor verified')}><BadgeCheck size={17} /></IconBtn>
            <IconBtn title={v.featured ? 'Unfeature' : 'Feature'} tone={v.featured ? '!text-gold' : ''} onClick={() => act(v._id, v.featured ? 'unfeature' : 'feature', v.featured ? 'Removed from featured' : 'Vendor featured')}><Star size={16} className={v.featured ? 'fill-gold' : ''} /></IconBtn>
            <IconBtn title="Edit" onClick={() => setForm(v)}><Pencil size={16} /></IconBtn>
            <IconBtn title="Delete" tone="hover:!text-red-600" onClick={() => del(v)}><Trash2 size={16} /></IconBtn>
          </div>) },
      ]} />
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />
      <VendorForm open={!!form} vendor={form?._id ? form : null} onClose={() => setForm(null)} onSaved={state.reload} />
    </>
  );
}
