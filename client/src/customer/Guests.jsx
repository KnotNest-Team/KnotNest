import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Copy, Eye, Mail, MessageCircle, Pencil, Send, Trash2, Upload, UserPlus, Users, UserCheck, UserX, Clock, BellRing, Palette } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { guestApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { Input, Select, Textarea } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { errMsg, fieldErrors, fmtDate, imgUrl } from '../utils/format';

const SIDES = [{ value: 'both', label: 'Both sides' }, { value: 'bride', label: "Bride's side" }, { value: 'groom', label: "Groom's side" }];
const DOT = { attending: 'bg-emerald-500', declined: 'bg-red-400', pending: 'bg-amber-400' };
export const rsvpLink = (token) => `${window.location.origin}/rsvp/${token}`;
const waLink = (g, couple) => {
  const text = encodeURIComponent(`Namaste ${g.name}! ${couple ? `${couple} would love you to join their wedding celebrations.` : 'You are invited to our wedding celebrations.'} Please RSVP here: ${rsvpLink(g.token)}`);
  let digits = (g.phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits.length >= 11 ? digits : ''}?text=${text}`;
};

function EventPicker({ events, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between"><span className="kn-label !mb-0">Invited to</span>
        <button type="button" className="text-xs text-maroon hover:underline" onClick={() => onChange(value.length === events.length ? [] : events.map((e) => e._id))}>{value.length === events.length ? 'Clear all' : 'Select all'}</button></div>
      <div className="flex flex-wrap gap-2">
        {events.map((e) => {
          const on = value.includes(e._id);
          return <button type="button" key={e._id} onClick={() => toggle(e._id)} aria-pressed={on}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${on ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/15 hover:ring-maroon'}`}>{e.name} <span className={on ? 'text-ivory/70' : 'text-muted'}>{fmtDate(e.date, { day: 'numeric', month: 'short' })}</span></button>;
        })}
      </div>
    </div>
  );
}

function GuestForm({ guest, events, onClose, onSaved }) {
  const toast = useToast();
  const [picked, setPicked] = useState(guest ? guest.events.map((e) => String(e.event)) : events.map((e) => e._id));
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: guest?.name || '', email: guest?.email || '', phone: guest?.phone || '', side: guest?.side || 'both', maxGuests: guest?.maxGuests || 2, seat: guest?.seat || '' },
  });
  const submit = async (d) => {
    const body = { ...d, maxGuests: Number(d.maxGuests) || 1, events: picked };
    try {
      if (guest) await guestApi.update(guest._id, body); else await guestApi.create(body);
      toast.success(guest ? 'Guest updated' : `${d.name} added to your guest list`);
      onSaved(); onClose();
    } catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); toast.error(errMsg(e)); }
  };
  return (
    <Modal open onClose={onClose} size="lg" title={guest ? `Edit ${guest.name}` : 'Add a guest'} subtitle="One invitation can cover a whole family."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>{guest ? 'Save guest' : 'Add guest'}</Button></>}>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input wrapClass="sm:col-span-2" label="Name on the invitation" placeholder="e.g. Sharma Uncle & family" error={errors.name?.message} {...register('name', { required: 'Enter the guest or family name' })} />
        <Input label="Email" type="email" placeholder="For the email invitation" error={errors.email?.message} {...register('email')} />
        <Input label="Phone (for WhatsApp)" placeholder="10-digit mobile" {...register('phone')} />
        <Select label="Side" options={SIDES} {...register('side')} />
        <Input label="People on this invitation" type="number" min="1" max="20" {...register('maxGuests')} />
        <Input wrapClass="sm:col-span-2" label="Table or seat (optional)" placeholder="e.g. T4" hint="Shown on the invitation only if you fill it in." {...register('seat')} />
        <div className="sm:col-span-2"><EventPicker events={events} value={picked} onChange={setPicked} /></div>
      </form>
    </Modal>
  );
}

/** Paste rows from a spreadsheet: Name, Email, Phone, People */
function ImportForm({ events, onClose, onSaved }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(events.map((e) => e._id));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const rows = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name = '', email = '', phone = '', people = ''] = l.split(/\t|,/).map((x) => x.trim());
    return { name, email, phone, maxGuests: Number(people) || 2 };
  });
  const run = async () => {
    if (!rows.length) return toast.error('Paste at least one guest');
    setBusy(true);
    try {
      const r = await guestApi.import(rows, picked);
      setResult(r); onSaved();
      toast.success(`${r.added} ${r.added === 1 ? 'guest' : 'guests'} added`);
      if (!r.skipped.length) onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="lg" title="Import guests" subtitle="Paste from Excel or Google Sheets, one guest per line."
      footer={<><Button variant="ghost" onClick={onClose}>{result ? 'Done' : 'Cancel'}</Button><Button loading={busy} icon={Upload} onClick={run}>Import {rows.length || ''} {rows.length === 1 ? 'guest' : 'guests'}</Button></>}>
      <div className="grid gap-4">
        <Textarea label="Name, email, phone, number of people" rows={8} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={'Sharma Uncle & family, sharma@example.com, 9810000001, 4\nRiya Kapoor, riya@example.com, , 2\nNani & Nana, , 9810000005, 2'} hint="Only the name is required. Columns can be separated by commas or tabs." />
        <EventPicker events={events} value={picked} onChange={setPicked} />
        {result?.skipped.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">{result.skipped.length} {result.skipped.length === 1 ? 'row was' : 'rows were'} not added:</p>
            <ul className="mt-1 list-disc pl-5">{result.skipped.map((s) => <li key={s.row}>Row {s.row}{s.name && ` (${s.name})`}: {s.reason}</li>)}</ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PreviewModal({ guestId, onClose }) {
  const [reminder, setReminder] = useState(false);
  const state = useFetch(() => guestApi.preview({ ...(guestId && { guest: guestId }), reminder }), [guestId, reminder]);
  return (
    <Modal open onClose={onClose} size="lg" title="Invitation preview" subtitle={state.data?.subject || 'This is exactly what your guests receive.'}
      footer={<><Button variant={reminder ? 'ghost' : 'soft'} size="sm" onClick={() => setReminder(false)}>Invitation</Button><Button variant={reminder ? 'soft' : 'ghost'} size="sm" onClick={() => setReminder(true)}>Reminder</Button><Button onClick={onClose}>Close</Button></>}>
      <Async state={state}>{(d) => <iframe title="Invitation email preview" srcDoc={d.html} className="h-[65vh] w-full rounded-xl border border-ink/10 bg-ivory" sandbox="allow-popups" />}</Async>
    </Modal>
  );
}

export default function Guests() {
  const toast = useToast();
  const state = useFetch(() => guestApi.list());
  const [modal, setModal] = useState(null); // 'add' | 'import' | {edit} | {preview}
  const [q, setQ] = useState(''); const [eventF, setEventF] = useState(''); const [reply, setReply] = useState(''); const [side, setSide] = useState('');
  const [busy, setBusy] = useState('');
  const d = state.data;
  const queued = d?.guests.some((g) => g.invite?.status === 'queued');

  // while invitations are going out, refresh every 2 seconds so statuses update live
  useEffect(() => {
    if (!queued) return undefined;
    const t = setInterval(() => state.reload(), 2000);
    return () => clearInterval(t);
  }, [queued]); // eslint-disable-line

  const rows = useMemo(() => (d?.guests || []).filter((g) => {
    if (q && !`${g.name} ${g.email} ${g.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (side && g.side !== side) return false;
    const rs = eventF ? g.events.filter((e) => String(e.event) === eventF) : g.events;
    if (eventF && !rs.length) return false;
    if (reply && !rs.some((e) => e.status === reply)) return false;
    return true;
  }), [d, q, eventF, reply, side]);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { const r = await fn(); toast.success(typeof msg === 'function' ? msg(r) : msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const copy = async (g) => { try { await navigator.clipboard.writeText(rsvpLink(g.token)); toast.success('RSVP link copied'); } catch { window.prompt('Copy this link', rsvpLink(g.token)); } };
  const remove = (g) => window.confirm(`Remove ${g.name} from your guest list? Their RSVP link will stop working.`) && run(g._id + 'del', () => guestApi.remove(g._id), 'Guest removed');

  return (
    <>
      <PageHeader title="Guests & RSVP" subtitle="Invite each guest to the right events, send personal invitations and see who's coming."
        action={d?.events.length > 0 && <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Palette} to="/customer/invitation">Design</Button>
          <Button variant="secondary" icon={Eye} onClick={() => setModal({ preview: null })}>Preview email</Button>
          <Button variant="secondary" icon={Upload} onClick={() => setModal('import')}>Import</Button>
          <Button icon={UserPlus} onClick={() => setModal('add')}>Add guest</Button>
        </div>} />
      <Async state={state}>
        {(data) => {
          if (data.needsWedding) return <EmptyState icon={Users} title="Set up your wedding first" message="Add your wedding details and events, then invite guests here." action={<Button to="/customer/wedding">Set up my wedding</Button>} />;
          if (!data.events.length) return <EmptyState icon={Users} title="Add your events first" message="Invitations list each function with its date and venue. Add haldi, sangeet, wedding and the rest on My Wedding, then come back to invite guests." action={<Button to="/customer/wedding">Add events</Button>} />;
          const s = data.summary;
          const toSend = data.guests.filter((g) => g.email && g.events.length && ['not_sent', 'failed'].includes(g.invite?.status)).length;
          const toRemind = data.guests.filter((g) => g.email && g.invite?.status === 'sent' && g.events.some((e) => e.status === 'pending')).length;
          const couple = data.couple;
          const eventName = Object.fromEntries(data.events.map((e) => [String(e._id), e.name]));
          return (
            <div className="grid gap-6">
              {data.mail.mode === 'none' && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><b className="font-medium">Email isn't set up yet.</b> Ask the site admin to add SMTP settings. Meanwhile you can share each guest's RSVP link on WhatsApp or copy it.</p>
              )}
              {!data.mail.delivers && data.mail.mode !== 'none' && (
                <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-[#6d4c22]">
                  <b className="font-medium">Test mode.</b> Invitations are caught in a {data.mail.mode === 'ethereal' ? 'test inbox' : 'local outbox'} and not delivered to real people. Use the preview link next to each guest to see the email. To send for real, add your SMTP details to <code className="rounded bg-white/70 px-1">server/.env</code>.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardCard label="Invitations" icon={Mail} value={s.invited} hint={`${data.guests.filter((g) => g.invite?.status === 'sent').length} sent`} />
                <DashboardCard label="People coming" icon={UserCheck} tone="green" value={s.headcount} hint={`${s.attending} ${s.attending === 1 ? 'invitation' : 'invitations'} accepted`} />
                <DashboardCard label="Can't come" icon={UserX} tone="gold" value={s.declined} hint="Declined every event" />
                <DashboardCard label="Awaiting reply" icon={Clock} tone="amber" value={s.pending} hint={toRemind ? `${toRemind} can be reminded` : 'No reminders due'} />
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Card title="By event" pad={false}>
                  <div className="kn-scroll overflow-x-auto">
                    <table className="w-full min-w-[460px] text-left text-sm">
                      <thead><tr className="border-b border-ink/10 text-xs text-muted"><th className="px-5 py-2.5 font-medium">Event</th><th className="px-3 py-2.5 font-medium">Invited</th><th className="px-3 py-2.5 font-medium">People coming</th><th className="px-3 py-2.5 font-medium">Can't come</th><th className="px-5 py-2.5 font-medium">No reply</th></tr></thead>
                      <tbody>{s.perEvent.map((p) => (
                        <tr key={p.event} className="border-b border-ink/5 last:border-0">
                          <td className="px-5 py-3"><p className="font-medium text-ink">{p.name}</p><p className="text-xs text-muted">{fmtDate(p.date)}</p></td>
                          <td className="px-3 py-3 text-ink-2">{p.invited}</td>
                          <td className="px-3 py-3"><span className="font-display text-2xl text-emerald-700">{p.headcount}</span></td>
                          <td className="px-3 py-3 text-ink-2">{p.declined}</td><td className="px-5 py-3 text-ink-2">{p.pending}</td>
                        </tr>))}</tbody>
                    </table>
                  </div>
                </Card>
                <Card title="Send">
                  <div className="grid gap-3">
                    <Button size="lg" icon={Send} disabled={!toSend || queued} loading={busy === 'send'} onClick={() => run('send', () => guestApi.send({ onlyNew: true }), (r) => `Sending ${r.queued} ${r.queued === 1 ? 'invitation' : 'invitations'}…`)}>
                      {queued ? 'Sending…' : toSend ? `Send ${toSend} new ${toSend === 1 ? 'invitation' : 'invitations'}` : 'All invitations sent'}
                    </Button>
                    <Button variant="secondary" icon={BellRing} disabled={!toRemind || queued} loading={busy === 'remind'} onClick={() => window.confirm(`Send a reminder to ${toRemind} ${toRemind === 1 ? 'guest' : 'guests'} who haven't replied?`) && run('remind', () => guestApi.remind(), (r) => `Sending ${r.queued} reminders…`)}>
                      {toRemind ? `Remind ${toRemind} pending ${toRemind === 1 ? 'guest' : 'guests'}` : 'No one to remind'}
                    </Button>
                    <p className="text-xs leading-relaxed text-muted">Every guest gets their own email, so nobody sees anyone else's address. Guests without email can be invited on WhatsApp from the list below.</p>
                    {Object.keys(s.food).length > 0 && <p className="border-t border-ink/10 pt-3 text-sm text-ink-2"><b className="font-medium text-ink">Food for confirmed guests: </b>{Object.entries(s.food).map(([k, v]) => `${k} ${v}`).join(', ')}</p>}
                  </div>
                </Card>
              </div>

              <div>
                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input aria-label="Search guests" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
                  <Select aria-label="Filter by event" placeholder="All events" value={eventF} onChange={(e) => setEventF(e.target.value)} options={data.events.map((e) => ({ value: e._id, label: e.name }))} />
                  <Select aria-label="Filter by reply" placeholder="Any reply" value={reply} onChange={(e) => setReply(e.target.value)} options={[{ value: 'attending', label: 'Coming' }, { value: 'declined', label: "Can't come" }, { value: 'pending', label: 'No reply yet' }]} />
                  <Select aria-label="Filter by side" placeholder="Both sides" value={side} onChange={(e) => setSide(e.target.value)} options={SIDES.slice(1)} />
                </div>
                <Table rows={rows} empty={<EmptyState icon={UserPlus} title={data.guests.length ? 'No guests match these filters' : 'Your guest list is empty'} message={data.guests.length ? 'Try clearing a filter.' : 'Add guests one by one or paste your list from a spreadsheet.'} action={!data.guests.length && <div className="flex gap-2"><Button variant="secondary" onClick={() => setModal('import')}>Import list</Button><Button onClick={() => setModal('add')}>Add guest</Button></div>} />} columns={[
                  { key: 'n', header: 'Guest', render: (g) => <div className="min-w-[180px]"><p className="font-medium text-ink">{g.name}</p><p className="text-xs text-muted">{[g.email, g.phone].filter(Boolean).join(' · ') || 'No contact details'}</p><p className="text-xs text-muted">{g.side === 'both' ? 'Both sides' : g.side === 'bride' ? "Bride's side" : "Groom's side"} · up to {g.maxGuests}{g.seat && ` · Table ${g.seat}`}</p></div> },
                  { key: 'e', header: 'Replies', render: (g) => g.events.length ? <div className="flex max-w-[280px] flex-wrap gap-1.5">{g.events.map((e) => (
                    <span key={e.event} title={e.status} className="inline-flex items-center gap-1.5 rounded-full bg-ivory px-2.5 py-0.5 text-xs text-ink-2 ring-1 ring-ink/10"><span className={`h-1.5 w-1.5 rounded-full ${DOT[e.status]}`} />{eventName[String(e.event)]}{e.status === 'attending' && ` ${e.headcount}`}</span>))}</div>
                    : <span className="text-xs text-amber-700">Not invited to any event</span> },
                  { key: 'i', header: 'Invitation', render: (g) => <div className="flex flex-col items-start gap-1"><Badge status={g.invite?.status || 'not_sent'} />
                    {g.invite?.status === 'failed' && <span className="max-w-[180px] text-xs text-red-600">{g.invite.error}</span>}
                    {g.invite?.previewUrl && <a href={imgUrl(g.invite.previewUrl)} target="_blank" rel="noreferrer" className="text-xs text-maroon underline">Open sent email</a>}
                    {g.foodPreference && <span className="text-xs text-muted">{g.foodPreference}</span>}</div> },
                  { key: 'a', header: '', className: 'text-right', render: (g) => (
                    <div className="flex justify-end gap-0.5">
                      <a href={waLink(g, couple)} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted hover:bg-emerald-50 hover:text-emerald-700" title="Share on WhatsApp" aria-label={`Share invitation with ${g.name} on WhatsApp`}><MessageCircle size={16} /></a>
                      <button onClick={() => copy(g)} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" title="Copy RSVP link" aria-label={`Copy RSVP link for ${g.name}`}><Copy size={16} /></button>
                      {g.email && <button disabled={g.invite?.status === 'queued' || !g.events.length} onClick={() => run(g._id + 'send', () => guestApi.send({ guestIds: [g._id] }), g.invite?.status === 'sent' ? 'Invitation sent again' : 'Invitation sending…')} className="rounded-full p-2 text-muted hover:bg-maroon/10 hover:text-maroon disabled:opacity-40" title={g.invite?.status === 'sent' ? 'Send again' : 'Send invitation'} aria-label={`Send invitation to ${g.name}`}><Send size={16} /></button>}
                      <button onClick={() => setModal({ preview: g._id })} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" title="Preview this guest's invitation" aria-label={`Preview invitation for ${g.name}`}><Eye size={16} /></button>
                      <button onClick={() => setModal({ edit: g })} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" title="Edit" aria-label={`Edit ${g.name}`}><Pencil size={16} /></button>
                      <button onClick={() => remove(g)} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" title="Remove" aria-label={`Remove ${g.name}`}><Trash2 size={16} /></button>
                    </div>) },
                ]} />
              </div>
              {modal === 'add' && <GuestForm events={data.events} onClose={() => setModal(null)} onSaved={state.reload} />}
              {typeof modal === 'object' && modal?.edit && <GuestForm guest={modal.edit} events={data.events} onClose={() => setModal(null)} onSaved={state.reload} />}
              {modal === 'import' && <ImportForm events={data.events} onClose={() => setModal(null)} onSaved={state.reload} />}
              {typeof modal === 'object' && modal && 'preview' in modal && <PreviewModal guestId={modal.preview} onClose={() => setModal(null)} />}
            </div>
          );
        }}
      </Async>
    </>
  );
}
