import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Input, Textarea } from '../components/Field';
import { EmptyState } from '../components/States';

/**
 * Generic add/edit/delete list editor used for services and packages.
 * fields: [{ key, label, type: 'text'|'number'|'textarea'|'lines', required? }]
 * `lines` fields are edited one-per-line and stored as string[].
 */
export default function ItemManager({ items = [], fields, onSave, noun, render }) {
  const [edit, setEdit] = useState(null);
  const [idx, setIdx] = useState(-1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === 'lines' ? '' : '']));
  const open = (i) => {
    setIdx(i); setErr('');
    setEdit(i < 0 ? blank() : Object.fromEntries(fields.map((f) => [f.key, f.type === 'lines' ? (items[i][f.key] || []).join('\n') : items[i][f.key] ?? ''])));
  };
  const toItem = () => Object.fromEntries(fields.map((f) => [f.key,
    f.type === 'lines' ? edit[f.key].split('\n').map((s) => s.trim()).filter(Boolean) : f.type === 'number' ? Number(edit[f.key]) || 0 : edit[f.key]]));

  const save = async () => {
    const miss = fields.find((f) => f.required && !String(edit[f.key]).trim());
    if (miss) return setErr(`${miss.label} is required`);
    setBusy(true);
    const next = idx < 0 ? [...items, toItem()] : items.map((it, i) => (i === idx ? { ...it, ...toItem() } : it));
    const ok = await onSave(next, `${noun} saved`);
    setBusy(false); if (ok) setEdit(null);
  };
  const remove = (i) => window.confirm(`Delete this ${noun.toLowerCase()}?`) && onSave(items.filter((_, k) => k !== i), `${noun} deleted`);

  return (
    <>
      <div className="mb-5 flex justify-end"><Button icon={Plus} onClick={() => open(-1)}>Add {noun.toLowerCase()}</Button></div>
      {items.length === 0 ? <EmptyState title={`No ${noun.toLowerCase()}s yet`} message={`Add your first ${noun.toLowerCase()} so couples know what you offer.`} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it, i) => (
            <div key={it._id || i} className="flex flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
              <div className="flex-1">{render(it)}</div>
              <div className="mt-4 flex gap-2 border-t border-ink/10 pt-3">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => open(i)}>Edit</Button>
                <Button size="sm" variant="ghost" icon={Trash2} className="!text-red-600" onClick={() => remove(i)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`${idx < 0 ? 'Add' : 'Edit'} ${noun.toLowerCase()}`} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid gap-4">
            {fields.map((f) => {
              const p = { key: f.key, label: f.label, value: edit[f.key], onChange: (e) => setEdit({ ...edit, [f.key]: e.target.value }) };
              if (f.type === 'textarea' || f.type === 'lines') return <Textarea {...p} rows={f.type === 'lines' ? 5 : 3} hint={f.type === 'lines' ? 'One per line' : undefined} />;
              return <Input {...p} type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} />;
            })}
            {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
