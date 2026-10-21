import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { categoryApi, locationApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ImageUploader from '../components/ImageUploader';
import { Input, Select, Textarea } from '../components/Field';
import { EmptyState, ErrorState } from '../components/States';
import { errMsg, imgUrl } from '../utils/format';

const Actions = ({ onEdit, onDelete }) => (
  <div className="flex justify-end">
    <button title="Edit" aria-label="Edit" onClick={onEdit} className="rounded-full p-2 text-muted hover:bg-ink/5"><Pencil size={16} /></button>
    <button title="Delete" aria-label="Delete" onClick={onDelete} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
  </div>
);

export function Categories() {
  const toast = useToast();
  const state = useFetch(() => categoryApi.list({ all: true }));
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit.name?.trim()) return toast.error('Name is required');
    setBusy(true);
    try { edit._id ? await categoryApi.update(edit._id, edit) : await categoryApi.create(edit); toast.success('Category saved'); setEdit(null); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const del = async (c) => { if (!window.confirm(`Delete "${c.name}"?`)) return; try { await categoryApi.remove(c._id); toast.success('Category deleted'); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  const toggle = async (c) => { try { await categoryApi.update(c._id, { status: c.status === 'active' ? 'inactive' : 'active' }); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return (
    <>
      <PageHeader title="Categories" subtitle="Vendor categories shown across the site." action={<Button icon={Plus} onClick={() => setEdit({ name: '', description: '', image: '', status: 'active' })}>Add category</Button>} />
      <Table loading={state.loading} rows={state.data?.categories} empty={<EmptyState title="No categories" />} columns={[
        { key: 'i', header: '', render: (c) => <img src={imgUrl(c.image)} alt="" className="h-11 w-11 rounded-lg bg-ivory-2 object-cover" /> },
        { key: 'name', header: 'Name', render: (c) => <div><p className="font-medium text-ink">{c.name}</p><p className="max-w-xs truncate text-xs text-muted">{c.description}</p></div> },
        { key: 'v', header: 'Vendors', render: (c) => c.vendorCount },
        { key: 's', header: 'Status', render: (c) => <button onClick={() => toggle(c)} title="Click to toggle" aria-label={`Toggle ${c.name}`}><Badge status={c.status} /></button> },
        { key: 'a', header: '', render: (c) => <Actions onEdit={() => setEdit({ ...c })} onDelete={() => del(c)} /> },
      ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit category' : 'Add category'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && <div className="grid gap-4">
          <Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <Textarea label="Description" rows={3} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <ImageUploader kind="category" label="Image" value={edit.image} onChange={(image) => setEdit({ ...edit, image })} />
          <Select label="Status" options={['active', 'inactive']} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} />
        </div>}
      </Modal>
    </>
  );
}

export function Locations() {
  const toast = useToast();
  const state = useFetch(() => locationApi.list({ all: true }));
  const [edit, setEdit] = useState(null);
  const save = async () => {
    if (!edit.city?.trim()) return toast.error('City is required');
    try { edit._id ? await locationApi.update(edit._id, edit) : await locationApi.create(edit); toast.success('Location saved'); setEdit(null); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (l) => { if (!window.confirm(`Delete ${l.city}?`)) return; try { await locationApi.remove(l._id); toast.success('Location deleted'); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return (
    <>
      <PageHeader title="Locations" subtitle="Cities available in vendor filters and forms." action={<Button icon={Plus} onClick={() => setEdit({ city: '', state: '', status: 'active' })}>Add location</Button>} />
      <Table loading={state.loading} rows={state.data?.locations} empty={<EmptyState title="No locations" />} columns={[
        { key: 'city', header: 'City', render: (l) => <span className="font-medium text-ink">{l.city}</span> }, { key: 'state', header: 'State' },
        { key: 's', header: 'Status', render: (l) => <Badge status={l.status} /> },
        { key: 'a', header: '', render: (l) => <Actions onEdit={() => setEdit({ ...l })} onDelete={() => del(l)} /> },
      ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} size="sm" title={edit?._id ? 'Edit location' : 'Add location'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {edit && <div className="grid gap-4"><Input label="City" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /><Input label="State" value={edit.state || ''} onChange={(e) => setEdit({ ...edit, state: e.target.value })} /><Select label="Status" options={['active', 'inactive']} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} /></div>}
      </Modal>
    </>
  );
}
