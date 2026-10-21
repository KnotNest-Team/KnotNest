import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import useFetch from '../hooks/useFetch';
import { weddingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import { Input, Select, Textarea } from '../components/Field';
import { Async } from '../components/States';
import EventsCard from './EventsCard';
import PlanEventsModal from './PlanEventsModal';
import { errMsg, fieldErrors, toInputDate } from '../utils/format';

const STYLES = ['Traditional', 'Royal', 'Modern', 'Destination', 'Beach', 'Intimate', 'Fusion', 'Minimal'];
const DAY = 864e5;

export default function Wedding() {
  const toast = useToast();
  const { user } = useAuth();
  const state = useFetch(() => weddingApi.get());
  const trad = useFetch(() => weddingApi.traditions());
  const [planOpen, setPlanOpen] = useState(false);
  const w = state.data?.wedding;
  const events = state.data?.events || [];
  const traditions = trad.data?.traditions || [];
  const tradOptions = traditions.map((t) => ({ value: t.key, label: `${t.label} (${t.group})` }));
  const labelOf = (k) => traditions.find((t) => t.key === k)?.label || '';
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm();
  useEffect(() => {
    if (state.data && trad.data) reset({
      partnerName: w?.partnerName || '', weddingDate: toInputDate(w?.weddingDate), location: w?.location || '', guestCount: w?.guestCount || '', budget: w?.budget || '',
      weddingStyle: w?.weddingStyle || '', coupleNames: w?.coupleNames || '', inviteMessage: w?.inviteMessage || '', culture: w?.culture || '', partnerCulture: w?.partnerCulture || '', muhurat: w?.muhurat || '',
    });
  }, [state.data, trad.data]); // eslint-disable-line

  const submit = async (d) => {
    const body = { ...d, guestCount: Number(d.guestCount) || 0, budget: Number(d.budget) || 0, weddingDate: d.weddingDate || undefined };
    // moving the wedding date: offer to move every event and open task with it (personal edits are kept)
    const oldDate = toInputDate(w?.weddingDate);
    if (w && oldDate && d.weddingDate && d.weddingDate !== oldDate && events.length) {
      const n = Math.round((new Date(d.weddingDate) - new Date(oldDate)) / DAY);
      body.shiftEvents = window.confirm(`Your wedding date moved ${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'} ${n > 0 ? 'later' : 'earlier'}.\n\nMove all ${events.length} events and your open checklist dates by the same amount? Your names, times and venues stay exactly as you set them.`);
    }
    try {
      const res = w ? await weddingApi.update(body) : await weddingApi.create(body);
      state.setData({ wedding: res.wedding, events: res.events || events });
      if (res.planned) toast.success(`We planned ${res.planned} ${labelOf(res.wedding.culture)} events for you. Change anything you like.`);
      else if (res.shifted) toast.success(`Saved. ${res.shifted} events moved to match the new date.`);
      else toast.success(w ? 'Wedding details updated' : 'Wedding profile created. Your checklist is ready!');
      // a new tradition on a plan that already has events: show suggestions to add from it
      if (w && events.length && d.culture && (d.culture !== w.culture || d.partnerCulture !== w.partnerCulture)) setPlanOpen(true);
    } catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); toast.error(errMsg(e)); }
  };
  const fallbackCouple = [user.name.split(' ')[0], watch('partnerName')].filter(Boolean).join(' & ');
  const canPlan = !!(w?.culture && w?.weddingDate);
  const planLabel = [labelOf(w?.culture), w?.partnerCulture && w.partnerCulture !== w.culture ? labelOf(w.partnerCulture) : ''].filter(Boolean).join(' + ');

  return (
    <>
      <PageHeader title="My Wedding" subtitle="Tell us your tradition and date. We plan the events, checklist and invitations around them." />
      <Async state={state}>
        {() => (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <form onSubmit={handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2" noValidate>
                <Select label="Bride's family tradition" placeholder="Choose a tradition" options={tradOptions} error={errors.culture?.message} {...register('culture')}
                  hint="Decides which functions we plan and their usual days." />
                <Select label="Groom's family tradition" placeholder="Same as the bride's family" options={tradOptions} error={errors.partnerCulture?.message} {...register('partnerCulture')}
                  hint="For two-culture weddings: we add their customs too." />
                <Input label="Main wedding date" type="date" error={errors.weddingDate?.message} {...register('weddingDate')} />
                <Input label="Muhurat time (optional)" type="time" error={errors.muhurat?.message} {...register('muhurat')} hint="From your family priest. Sets the main ceremony time." />
                <Input label="Partner's name" error={errors.partnerName?.message} {...register('partnerName')} />
                <Input label="Location / city" placeholder="e.g. Jaipur" {...register('location')} />
                <Select label="Look and feel" placeholder="Choose a style" options={w?.weddingStyle && !STYLES.includes(w.weddingStyle) ? [w.weddingStyle, ...STYLES] : STYLES} {...register('weddingStyle')} />
                <Input label="Expected guests" type="number" min="0" error={errors.guestCount?.message} {...register('guestCount')} hint="Your guest list shows confirmed numbers." />
                <Input label="Total budget (₹)" type="number" min="0" error={errors.budget?.message} {...register('budget')} />
                <div className="border-t border-ink/10 pt-5 sm:col-span-2"><h3 className="font-display text-xl text-ink">On your invitations</h3></div>
                <Input wrapClass="sm:col-span-2" label="Names on the invitation" placeholder={fallbackCouple || 'e.g. Diya & Aarav'} hint={`Leave empty to use "${fallbackCouple || 'your names'}".`} {...register('coupleNames')} />
                <Textarea wrapClass="sm:col-span-2" rows={3} label="Invitation message" placeholder="With the blessings of our families, we invite you to celebrate with us..." {...register('inviteMessage')} />
                <div className="sm:col-span-2"><Button size="lg" type="submit" loading={isSubmitting}>{w ? 'Save changes' : 'Create my wedding'}</Button></div>
              </form>
            </Card>
            {w ? <EventsCard events={events} canPlan={canPlan} onPlan={() => setPlanOpen(true)} onChange={(res) => state.setData((s) => ({ ...s, wedding: res.wedding, events: res.events }))} />
              : <Card title="Events"><p className="text-sm text-muted">Pick your tradition and wedding date, then save. We'll plan every function with its usual day and time, and you can change anything.</p></Card>}
            <PlanEventsModal open={planOpen} onClose={() => setPlanOpen(false)} traditionLabel={planLabel}
              onApplied={(res) => state.setData((s) => ({ ...s, wedding: res.wedding, events: res.events }))} />
          </div>
        )}
      </Async>
    </>
  );
}
