import { useState } from 'react';
import { Ban, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { Input, Select } from '../components/Field';
import { EmptyState, ErrorState } from '../components/States';
import { errMsg, fmtDate } from '../utils/format';

const IconBtn = ({ title, onClick, children, tone = '' }) => <button title={title} aria-label={title} onClick={onClick} className={`rounded-full p-2 text-muted hover:bg-ink/5 ${tone}`}>{children}</button>;

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [role, setRole] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const state = useFetch(() => adminApi.users({ search: dq, role, status, page, limit: 12 }), [dq, role, status, page]);
  const [view, setView] = useState(null); const [edit, setEdit] = useState(null);

  const run = async (fn, msg) => { try { await fn(); toast.success(msg); state.reload(); return true; } catch (e) { toast.error(errMsg(e)); return false; } };
  const open = async (u) => { try { setView({ ...(await adminApi.user(u._id)) }); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone registered on KnotNest." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchBar className="flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or phone" />
        <select aria-label="Role" className="kn-input !w-full sm:!w-40 !rounded-full" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select>
        <select aria-label="Status" className="kn-input !w-full sm:!w-40 !rounded-full" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </div>
      <Table loading={state.loading} rows={d?.users} empty={<EmptyState title="No users found" />} columns={[
        { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-ink">{u.name}</span> }, { key: 'email', header: 'Email' }, { key: 'phone', header: 'Phone', render: (u) => u.phone || '-' },
        { key: 'role', header: 'Role', render: (u) => <Badge tone={u.role === 'admin' ? 'maroon' : u.role === 'vendor' ? 'gold' : 'gray'}>{u.role}</Badge> },
        { key: 'status', header: 'Status', render: (u) => <Badge status={u.isActive ? 'active' : 'suspended'} /> },
        { key: 'created', header: 'Registered', render: (u) => fmtDate(u.createdAt) },
        { key: 'a', header: 'Actions', className: 'text-right', render: (u) => (
          <div className="flex justify-end">
            <IconBtn title="View" onClick={() => open(u)}><Eye size={16} /></IconBtn>
            <IconBtn title="Edit" onClick={() => setEdit({ ...u })}><Pencil size={16} /></IconBtn>
            {u._id !== me._id && <>
              <IconBtn title={u.isActive ? 'Suspend' : 'Reactivate'} tone={u.isActive ? 'hover:!text-red-600' : 'hover:!text-emerald-600'} onClick={() => run(() => adminApi.updateUser(u._id, { isActive: !u.isActive }), u.isActive ? 'User suspended' : 'User reactivated')}>{u.isActive ? <Ban size={16} /> : <RotateCcw size={16} />}</IconBtn>
              <IconBtn title="Delete" tone="hover:!text-red-600" onClick={() => window.confirm(`Delete ${u.name}? This removes their wedding data too.`) && run(() => adminApi.deleteUser(u._id), 'User deleted')}><Trash2 size={16} /></IconBtn></>}
          </div>) },
      ]} />
      <Pagination page={d?.page || 1} pages={d?.pages} onChange={setPage} />

      <Modal open={!!view} onClose={() => setView(null)} title={view?.user.name} subtitle={view?.user.email} size="sm">
        {view && <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted">Role</dt><dd className="font-medium capitalize">{view.user.role}</dd></div><div><dt className="text-muted">Phone</dt><dd>{view.user.phone || '-'}</dd></div><div><dt className="text-muted">Bookings</dt><dd>{view.stats.bookings}</dd></div><div><dt className="text-muted">Enquiries</dt><dd>{view.stats.enquiries}</dd></div><div><dt className="text-muted">Registered</dt><dd>{fmtDate(view.user.createdAt)}</dd></div>{view.wedding && <div><dt className="text-muted">Wedding date</dt><dd>{fmtDate(view.wedding.weddingDate)}</dd></div>}</dl>}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit user" size="sm" footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={async () => (await run(() => adminApi.updateUser(edit._id, { name: edit.name, phone: edit.phone, role: edit.role }), 'User updated')) && setEdit(null)}>Save</Button></>}>
        {edit && <div className="grid gap-4"><Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label="Phone" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /><Select label="Role" disabled={edit._id === me._id} options={['customer', 'vendor', 'admin']} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} /></div>}
      </Modal>
    </>
  );
}
