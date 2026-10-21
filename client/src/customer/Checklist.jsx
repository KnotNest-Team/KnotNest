import { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { weddingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Input } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { errMsg, fmtDate, toInputDate } from '../utils/format';

export default function Checklist() {
  const toast = useToast();
  const state = useFetch(() => weddingApi.get());
  const [edit, setEdit] = useState(null); // {_id?, title, dueDate}
  const [busy, setBusy] = useState(false);
  const w = state.data?.wedding;

  const run = async (fn, ok) => {
    try { const r = await fn(); state.setData({ wedding: r.wedding }); if (ok) toast.success(ok); return true; } catch (e) { toast.error(errMsg(e)); return false; }
  };
  const save = async () => {
    if (!edit.title.trim()) return toast.error('Task title is required');
    setBusy(true);
    const body = { title: edit.title, dueDate: edit.dueDate || undefined };
    const ok = await run(() => (edit._id ? weddingApi.updateTask(edit._id, body) : weddingApi.addTask(body)), edit._id ? 'Task updated' : 'Task added');
    setBusy(false); if (ok) setEdit(null);
  };

  return (
    <>
      <PageHeader title="Checklist" subtitle="Every task between 'yes' and 'I do'." action={w && <Button icon={Plus} onClick={() => setEdit({ title: '', dueDate: '' })}>Add task</Button>} />
      <Async state={state} isEmpty={(d) => !d.wedding} empty={<EmptyState title="Create your wedding first" message="Your checklist is generated when you set up your wedding profile." action={<Button to="/customer/wedding">Set up wedding</Button>} />}>
        {({ wedding }) => {
          const done = wedding.checklist.filter((t) => t.done).length;
          const pct = wedding.checklist.length ? Math.round((done / wedding.checklist.length) * 100) : 0;
          return (
            <div className="max-w-3xl">
              <Card className="mb-6">
                <div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">{pct}% complete</span><span className="text-muted">{done} of {wedding.checklist.length} done</span></div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gradient-to-r from-maroon to-gold transition-all duration-700" style={{ width: `${pct}%` }} /></div>
              </Card>
              {wedding.checklist.length === 0 ? <EmptyState title="No tasks" message="Add your first task." /> : (
                <ul className="grid gap-2">
                  {wedding.checklist.map((t) => (
                    <li key={t._id} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
                      <button onClick={() => run(() => weddingApi.updateTask(t._id, { done: !t.done }))} aria-label={t.done ? 'Mark as not done' : 'Mark as done'} aria-pressed={t.done}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${t.done ? 'border-maroon bg-maroon text-white' : 'border-ink/30 hover:border-maroon'}`}>{t.done && <Check size={14} />}</button>
                      <div className="min-w-0 flex-1"><p className={`truncate text-sm ${t.done ? 'text-muted line-through' : 'text-ink'}`}>{t.title}</p>{t.dueDate && <p className="text-xs text-muted">Due {fmtDate(t.dueDate)}</p>}</div>
                      <button onClick={() => setEdit({ _id: t._id, title: t.title, dueDate: toInputDate(t.dueDate) })} aria-label="Edit task" className="rounded-full p-2 text-muted hover:bg-ink/5"><Pencil size={16} /></button>
                      <button onClick={() => run(() => weddingApi.deleteTask(t._id), 'Task deleted')} aria-label="Delete task" className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </Async>
      <Modal open={!!edit} onClose={() => setEdit(null)} size="sm" title={edit?._id ? 'Edit task' : 'Add task'} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && <div className="grid gap-4"><Input label="Task" autoFocus value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /><Input label="Due date (optional)" type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></div>}
      </Modal>
    </>
  );
}
