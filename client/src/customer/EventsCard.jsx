import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarPlus, MapPin, Pencil, Trash2, Link2, Sparkles } from 'lucide-react';
import { weddingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Input, Select, Textarea } from '../components/Field';
import { errMsg, fieldErrors, toInputDate } from '../utils/format';

export const EVENT_NAMES = ['Roka', 'Engagement', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception', 'Cocktail', 'Puja'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date tile used for events here and on the guest-facing RSVP page. */
export const DateTile = ({ date, className = '' }) => {
  const d = new Date(date);
  return (
    <div className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-ink/10 bg-ivory/60 py-2 ${className}`}>
      <span className="text-[11px] tracking-[0.18em] text-gold">{MONTH[d.getUTCMonth()]}</span>
      <span className="font-display text-3xl leading-none text-maroon">{d.getUTCDate()}</span>
      <span className="text-[11px] text-muted">{d.getUTCFullYear()}</span>
    </div>
  );
};

function EventForm({ event, onClose, onSaved }) {
  const toast = useToast();
  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: event?.name || '', date: toInputDate(event?.date), time: event?.time || '', venueName: event?.venueName || '', address: event?.address || '', mapLink: event?.venueFromBooking ? '' : event?.mapLink?.includes('/maps/search/') ? '' : event?.mapLink || '', dressCode: event?.dressCode || '', notes: event?.notes || '', hostSide: event?.hostSide || 'both', meaning: event?.meaning || '' },
  });
  const linked = !!event?.venueFromBooking;
  const submit = async (d) => {
    try {
      const res = event ? await weddingApi.updateEvent(event._id, d) : await weddingApi.addEvent(d);
      toast.success(event ? 'Event updated' : `${d.name} added`);
      onSaved(res); onClose();
    } catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); toast.error(errMsg(e)); }
  };
  return (
    <Modal open onClose={onClose} size="lg" title={event ? `Edit ${event.name}` : 'Add an event'} subtitle="Guests see these details on their invitation and RSVP page."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>{event ? 'Save event' : 'Add event'}</Button></>}>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input label="Event name" placeholder="e.g. Sangeet" error={errors.name?.message} {...register('name', { required: 'Give the event a name' })} />
          <div className="mt-2 flex flex-wrap gap-1.5">{EVENT_NAMES.map((n) => <button type="button" key={n} onClick={() => setValue('name', n)} className="rounded-full bg-white px-3 py-1 text-xs text-ink-2 ring-1 ring-ink/10 hover:ring-maroon">{n}</button>)}</div>
        </div>
        <Input label="Date" type="date" error={errors.date?.message} {...register('date', { required: 'Pick a date' })} />
        <Input label="Time" placeholder="e.g. 7:30 PM onwards" {...register('time')} />
        {linked ? (
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2"><Link2 size={16} className="mt-0.5 shrink-0" /><span>The venue comes from your confirmed booking with <b className="font-medium">{event.venueName}</b> and stays in sync automatically.</span></p>
        ) : (<>
          <Input label="Venue name" placeholder="e.g. Narain Niwas Lawns" {...register('venueName')} />
          <Input label="Map link (optional)" placeholder="Paste a Google Maps link" error={errors.mapLink?.message} {...register('mapLink')} hint="Leave empty and we'll create one from the address." />
          <Textarea wrapClass="sm:col-span-2" label="Address" rows={2} {...register('address')} />
        </>)}
        <Input label="Dress code (optional)" placeholder="e.g. Pastels" {...register('dressCode')} />
        <Input label="Note for guests (optional)" placeholder="e.g. Parking at gate 2" {...register('notes')} />
        <Select label="Hosted by" options={[{ value: 'both', label: 'Both families' }, { value: 'bride', label: "Bride's side" }, { value: 'groom', label: "Groom's side" }]} {...register('hostSide')}
          hint={event ? undefined : 'New events are sent to guests from that side.'} />
        <Textarea wrapClass="sm:col-span-2" rows={2} label="What happens (shown to guests)" placeholder="e.g. A night of garba and dandiya with both families" {...register('meaning')} />
      </form>
    </Modal>
  );
}

const SIDE_LABEL = { bride: "Bride's side", groom: "Groom's side" };

export default function EventsCard({ events, onChange, canPlan, onPlan }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | 'new' | event
  const remove = async (e) => {
    if (!window.confirm(`Delete ${e.name}? Guests invited to it will no longer see it.`)) return;
    try { onChange(await weddingApi.deleteEvent(e._id)); toast.success(`${e.name} deleted`); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <Card title="Events" action={<div className="flex gap-2">{canPlan && <Button size="sm" variant="secondary" icon={Sparkles} onClick={onPlan}>Suggest events</Button>}<Button size="sm" icon={CalendarPlus} onClick={() => setEditing('new')}>Add event</Button></div>}>
      {events.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-display text-2xl text-ink">Your functions, planned for you</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{canPlan ? 'We know your tradition and date, so we can suggest every function with its usual day and time. You can change anything.' : 'Choose your tradition and main wedding date, and we\'ll plan your haldi, mehendi, sangeet and every other function with their usual days.'}</p>
          <div className="mt-4 flex justify-center gap-2">
            {canPlan && <Button icon={Sparkles} onClick={onPlan}>Plan my events</Button>}
            <Button variant="secondary" icon={CalendarPlus} onClick={() => setEditing('new')}>Add one myself</Button>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-ink/10">
          {events.map((e) => (
            <li key={e._id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <DateTile date={e.date} className="self-start" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-tight text-ink">{e.name}</p>
                {e.time && <p className="text-sm text-ink-2">{e.time}</p>}
                {(e.venueName || e.address) ? (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted"><MapPin size={14} className="mt-0.5 shrink-0" /><span>{[e.venueName, e.address].filter(Boolean).join(', ')}</span></p>
                ) : <p className="mt-1 text-sm text-amber-700">Venue not added yet</p>}
                {e.meaning && <p className="mt-1.5 font-serif text-[15px] italic leading-snug text-muted">{e.meaning}</p>}
                {(SIDE_LABEL[e.hostSide] || e.tradition) && <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {SIDE_LABEL[e.hostSide] && <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-ink-2">{SIDE_LABEL[e.hostSide]}</span>}
                  {e.tradition && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[#6d4c22]">{e.tradition}</span>}
                </div>}
                {e.venueFromBooking && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-600/20"><Link2 size={12} />From your venue booking</span>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(e)} className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${e.name}`}><Pencil size={16} /></button>
                <button onClick={() => remove(e)} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${e.name}`}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <EventForm event={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onChange} />}
    </Card>
  );
}
