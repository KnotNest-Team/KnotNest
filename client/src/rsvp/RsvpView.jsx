import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, Shirt, Check, X, Minus, Plus, Loader2, Sparkles } from 'lucide-react';
import { ArchFrame, Petals } from './art';
import { themeOf } from './themes';

const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const ease = [0.2, 0.7, 0.2, 1];

function Stepper({ value, max, onChange, label, c }) {
  const btn = 'grid h-9 w-9 place-items-center rounded-full bg-white disabled:opacity-40';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className={btn} style={{ boxShadow: `inset 0 0 0 1px ${c.cardBorder}` }} aria-label="One person fewer"><Minus size={16} /></button>
      <span className="w-20 text-center text-sm"><b className="font-display text-2xl font-medium" style={{ color: c.primary }}>{value}</b> {value === 1 ? 'person' : 'people'}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={btn} style={{ boxShadow: `inset 0 0 0 1px ${c.cardBorder}` }} aria-label="One person more"><Plus size={16} /></button>
    </div>
  );
}

/**
 * The guest-facing invitation and RSVP, drawn in the wedding's theme.
 * data: response of GET /rsvp/:token (or the couple's preview). onSubmit(payload) -> new data. preview: no submitting.
 */
export default function RsvpView({ data, onSubmit, preview = false, themeKey }) {
  const reduce = useReducedMotion();
  const T = themeOf(themeKey || data.theme);
  const c = T.colors;
  const { guest, couple } = data;
  const [answers, setAnswers] = useState(() => Object.fromEntries(guest.events.map((e) => [e._id, { status: e.status, headcount: e.headcount || Math.min(guest.maxGuests, 2) || 1 }])));
  const [food, setFood] = useState(guest.foodPreference || '');
  const [note, setNote] = useState(guest.guestNote || '');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(!!guest.respondedAt && !preview);
  const [celebrate, setCelebrate] = useState(false);

  const open = guest.events.filter((e) => !e.closed);
  const set = (id, patch) => { setAnswers((a) => ({ ...a, [id]: { ...a[id], ...patch } })); setErrors((x) => ({ ...x, [id]: undefined })); };
  const anyYes = open.some((e) => answers[e._id]?.status === 'attending');
  const first = guest.events[0]; const last = guest.events.at(-1);
  const fullDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const span = first ? (guest.events.length > 1 && shortDate(first.date) !== shortDate(last.date) ? `${shortDate(first.date)} to ${fullDay(last.date)}` : longDate(first.date)) : '';

  const submit = async () => {
    const missing = open.filter((e) => !['attending', 'declined'].includes(answers[e._id]?.status));
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((e) => [e._id, 'Let the couple know if you can make it'])));
      document.getElementById(`ev-${missing[0]._id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    if (preview) { setDone(true); setCelebrate(true); return; }
    setSaving(true); setSubmitError('');
    try {
      const d = await onSubmit({ responses: open.map((e) => ({ event: e._id, status: answers[e._id].status, headcount: answers[e._id].headcount })), foodPreference: anyYes ? food : '', guestNote: note });
      Object.assign(guest, d.guest);
      setDone(true); setCelebrate(true);
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } catch (e) { setErrors(e.details || {}); setSubmitError(e.message || 'Something went wrong. Please try again.'); } finally { setSaving(false); }
  };

  const card = { background: c.card, boxShadow: `0 1px 0 ${c.cardBorder}, 0 18px 40px -24px rgba(0,0,0,.25)`, border: `1px solid ${c.cardBorder}` };
  const pill = (on, solid) => ({ background: on ? solid : '#fff', color: on ? c.primaryInk : c.ink, boxShadow: on ? 'none' : `inset 0 0 0 1px ${c.cardBorder}` });

  return (
    <div className="min-h-screen font-sans" style={{ background: c.page, color: c.ink }}>
      {/* ---------- hero ---------- */}
      <header className="relative overflow-hidden" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${c.hero2} 0%, ${c.hero} 70%)`, color: c.heroInk }}>
        <div className="absolute inset-0" style={{ backgroundImage: T.pattern, opacity: T.patternOpacity }} aria-hidden="true" />
        {T.backdrop && <div className="pointer-events-none absolute left-1/2 top-1/2 w-[720px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.08]" aria-hidden="true"><div className="kn-spin">{T.backdrop}</div></div>}
        {!reduce && T.petals.length > 0 && <Petals colors={T.petals} count={18} />}
        {T.garland && <div className="relative z-10">{T.garland}</div>}

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-40 pt-6 sm:pb-28 sm:pt-10">
          <div className="relative mx-auto max-w-xl">
            <ArchFrame stroke={c.accent} fill="rgba(255,255,255,0.04)" className="absolute inset-x-0 -top-4 h-[calc(100%+3rem)] w-full" />
            <motion.div className="relative px-8 pb-10 pt-20 text-center sm:px-14 sm:pt-24" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }}>
              <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: c.heroMuted }}>{T.greeting}</p>
              <p className="mt-5 text-sm" style={{ color: c.heroMuted }}>Dear {guest.name},</p>
              <h1 className="mt-3 font-display text-5xl italic leading-[1.05] sm:text-7xl">{couple}</h1>
              <div className="mt-5 flex justify-center">{T.divider}</div>
              <p className="mx-auto mt-5 max-w-md font-display text-lg leading-relaxed sm:text-xl" style={{ color: c.heroInk, opacity: 0.92 }}>{data.message || `Together with their families, ${couple} request the pleasure of your company as they begin their journey together.`}</p>
              <p className="mt-6 text-sm tracking-wide" style={{ color: c.heroMuted }}>{span}{data.location && ` · ${data.location}`}</p>
              {guest.seat && <p className="mt-4 inline-block rounded-full px-4 py-1.5 text-sm" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: `inset 0 0 0 1px ${c.accent}` }}>Your table: <b className="font-medium">{guest.seat}</b></p>}
            </motion.div>
          </div>
        </div>

        {T.side && <>
          <motion.div className={`pointer-events-none absolute bottom-7 left-0 z-0 sm:bottom-9 sm:left-4 ${T.sideSize}`} initial={reduce ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.1, delay: 0.3, ease }}><div className="kn-float">{T.side}</div></motion.div>
          <motion.div className={`pointer-events-none absolute bottom-7 right-0 z-0 sm:bottom-9 sm:right-4 ${T.sideSize}`} initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.1, delay: 0.3, ease }}><div className="-scale-x-100"><div className="kn-float" style={{ animationDelay: '1.4s' }}>{T.side}</div></div></motion.div>
        </>}
        {/* scalloped edge into the page */}
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="absolute bottom-0 left-0 z-10 h-6 w-full sm:h-10" aria-hidden="true">
          <path d={`M0 40 ${Array.from({ length: 24 }, (_, i) => `Q${i * 50 + 25} 0 ${(i + 1) * 50} 40`).join(' ')} Z`} fill={c.page} />
        </svg>
      </header>

      <main className="relative mx-auto max-w-2xl px-4 pb-16">
        {/* ---------- thank-you ---------- */}
        {done && (
          <motion.section initial={reduce ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }} className="relative -mt-2 overflow-hidden rounded-3xl p-7 text-center" style={card} aria-live="polite">
            {celebrate && !reduce && T.petals.length > 0 && <Petals colors={T.petals} count={14} />}
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: c.tile }}><Sparkles size={24} style={{ color: c.primary }} /></div>
            <h2 className="mt-3 font-display text-4xl">Thank you!</h2>
            <p className="mt-1 text-sm" style={{ color: c.muted }}>{preview ? 'This is how guests see their confirmation.' : `We've let ${couple} know. You can change your answer any time before each event.`}</p>
            <ul className="mx-auto mt-5 max-w-md divide-y text-left text-sm" style={{ borderColor: c.cardBorder }}>
              {guest.events.map((e) => {
                const st = preview ? answers[e._id]?.status : e.status; const hc = preview ? answers[e._id]?.headcount : e.headcount;
                return (
                  <li key={e._id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderColor: c.cardBorder }}>
                    <span><b className="font-medium">{e.name}</b> <span style={{ color: c.muted }}>{shortDate(e.date)}</span></span>
                    {st === 'attending' ? <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap" style={{ color: '#2f7d4f' }}><Check size={16} />Coming, {hc}</span>
                      : st === 'declined' ? <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap" style={{ color: c.muted }}><X size={16} />Can't make it</span> : <span style={{ color: c.muted }}>No answer</span>}
                  </li>
                );
              })}
            </ul>
            <button onClick={() => { setDone(false); setCelebrate(false); }} className="mt-6 rounded-full px-6 py-2.5 text-sm font-medium transition hover:opacity-90" style={{ boxShadow: `inset 0 0 0 1.5px ${c.primary}`, color: c.primary }}>Change my answer</button>
          </motion.section>
        )}

        {/* ---------- events ---------- */}
        <section className={`grid gap-5 ${done ? 'mt-10' : '-mt-2'}`}>
          <h2 className="text-center font-display text-3xl">{guest.events.length > 1 ? 'You are invited to' : 'Join us for'}</h2>
          {guest.events.map((e, i) => {
            const a = answers[e._id] || {};
            const d = new Date(e.date);
            return (
              <motion.article key={e._id} id={`ev-${e._id}`} initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: (i % 3) * 0.06, ease }}
                className="relative overflow-hidden rounded-3xl p-5 sm:p-6" style={{ ...card, outline: errors[e._id] ? '2px solid #e5484d' : 'none' }}>
                <div className="pointer-events-none absolute -right-3 -top-3 opacity-15">{T.icon && <div className="scale-[3] origin-top-right">{T.icon}</div>}</div>
                <div className="relative flex gap-4">
                  <div className="flex w-[72px] shrink-0 flex-col items-center self-start rounded-2xl py-2.5" style={{ background: c.tile, boxShadow: `inset 0 0 0 1px ${c.cardBorder}` }}>
                    <span className="text-[11px] tracking-[0.2em]" style={{ color: c.primary, opacity: 0.75 }}>{MONTH[d.getUTCMonth()]}</span>
                    <span className="font-display text-4xl leading-none" style={{ color: c.primary }}>{d.getUTCDate()}</span>
                    <span className="text-[11px]" style={{ color: c.muted }}>{d.getUTCFullYear()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">{T.icon}<h3 className="font-display text-3xl leading-tight">{e.name}</h3></div>
                    <p className="mt-0.5 text-sm" style={{ color: c.ink, opacity: 0.85 }}>{longDate(e.date)}{e.time && `, ${e.time}`}</p>
                    {e.meaning && <p className="mt-2 font-serif text-[15px] italic leading-snug" style={{ color: c.muted }}>{e.meaning}</p>}
                    {(e.venueName || e.address) && <p className="mt-2.5 flex items-start gap-1.5 text-sm"><MapPin size={15} className="mt-0.5 shrink-0" style={{ color: c.accent === '#ffffff' ? c.primary : c.accent }} /><span>{[e.venueName, e.address].filter(Boolean).join(', ')}</span></p>}
                    {e.dressCode && <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: c.muted }}><Shirt size={15} />{e.dressCode}</p>}
                    {e.notes && <p className="mt-1 text-sm" style={{ color: c.muted }}>{e.notes}</p>}
                    {e.mapLink && <a href={e.mapLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-2" style={{ color: c.primary }}>View on map</a>}
                  </div>
                </div>
                {!done && (e.closed ? <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ background: c.tile, color: c.muted }}>This event has already taken place.</p> : (
                  <div className="relative mt-5 border-t pt-4" style={{ borderColor: c.cardBorder }}>
                    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`Can you attend the ${e.name}?`}>
                      <button type="button" role="radio" aria-checked={a.status === 'attending'} onClick={() => set(e._id, { status: 'attending' })} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition" style={pill(a.status === 'attending', c.primary)}><Check size={16} />Joyfully attending</button>
                      <button type="button" role="radio" aria-checked={a.status === 'declined'} onClick={() => set(e._id, { status: 'declined' })} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition" style={pill(a.status === 'declined', '#5b524c')}><X size={16} />Can't make it</button>
                      {a.status === 'attending' && guest.maxGuests > 1 && <div className="sm:ml-auto"><Stepper c={c} value={a.headcount || 1} max={guest.maxGuests} onChange={(n) => set(e._id, { headcount: n })} label={`People coming to the ${e.name}`} /></div>}
                    </div>
                    {errors[e._id] && <p className="mt-2 text-xs text-red-600" role="alert">{errors[e._id]}</p>}
                  </div>
                ))}
              </motion.article>
            );
          })}
        </section>

        {/* ---------- final details ---------- */}
        {!done && open.length > 0 && (
          <section className="mt-6 rounded-3xl p-5 sm:p-6" style={card}>
            {anyYes && (
              <fieldset>
                <legend className="kn-label">Food preference</legend>
                <div className="flex flex-wrap gap-2">{(data.foodOptions || []).map((f) => (
                  <button key={f} type="button" aria-pressed={food === f} onClick={() => setFood(food === f ? '' : f)} className="rounded-full px-4 py-2 text-sm transition" style={pill(food === f, c.primary)}>{f}</button>
                ))}</div>
              </fieldset>
            )}
            <label className={`block ${anyYes ? 'mt-5' : ''}`}><span className="kn-label">A note for {couple} (optional)</span>
              <textarea className="kn-input resize-y" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Blessings, wishes, or anything they should know" /></label>
            <p className="mt-3 text-xs" style={{ color: c.muted }}>This invitation is for up to {guest.maxGuests} {guest.maxGuests === 1 ? 'person' : 'people'}.</p>
            {submitError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{submitError}</p>}
            <button onClick={submit} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium tracking-wide transition hover:opacity-95 disabled:opacity-60 sm:w-auto" style={{ background: c.primary, color: c.primaryInk, boxShadow: `0 12px 30px -12px ${c.primary}` }}>
              {saving && <Loader2 size={16} className="animate-spin" />}{preview ? 'Send my RSVP (preview)' : 'Send my RSVP'}
            </button>
          </section>
        )}
        <p className="mt-10 text-center text-xs" style={{ color: c.muted }}>{preview ? 'Preview: answers are not saved.' : `This link is personal to you. Your answers are shared only with ${couple}.`}</p>
        <p className="mt-2 text-center font-display text-lg" style={{ color: c.muted }}>Knot<em>Nest</em></p>
      </main>
    </div>
  );
}
