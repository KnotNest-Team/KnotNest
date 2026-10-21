import { useState } from 'react';
import { Check, ExternalLink, Wand2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { weddingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { Async, EmptyState } from '../components/States';
import RsvpView from '../rsvp/RsvpView';
import { THEMES, THEME_ORDER } from '../rsvp/themes';
import { errMsg } from '../utils/format';

function Swatch({ t }) {
  const c = t.colors;
  return (
    <div className="relative h-24 overflow-hidden rounded-xl" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${c.hero2}, ${c.hero})` }}>
      <div className="absolute inset-0" style={{ backgroundImage: t.pattern, opacity: t.patternOpacity }} />
      <div className="absolute inset-x-0 bottom-0 h-7" style={{ background: c.page }} />
      <div className="absolute bottom-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full" style={{ background: c.card, boxShadow: `0 0 0 2px ${c.accent}` }}>{t.icon}</div>
    </div>
  );
}

/** Couples choose how their invitations and RSVP page look, with a live preview. */
export default function InvitationDesign() {
  const toast = useToast();
  const state = useFetch(() => weddingApi.get());
  const [pick, setPick] = useState(null);       // theme being previewed
  const [saving, setSaving] = useState(false);
  const previewState = useFetch(() => weddingApi.rsvpPreview(), [state.data?.wedding?._id], { enabled: !!state.data?.wedding });

  return (
    <>
      <PageHeader title="Invitation design" subtitle="Your guests see this design on their RSVP page, and its colours in their invitation email." />
      <Async state={state}>
        {({ wedding, events }) => {
          if (!wedding) return <EmptyState title="Set up your wedding first" message="Choose your tradition and add your events, then pick a design here." action={<Button to="/customer/wedding">Set up my wedding</Button>} />;
          const auto = previewState.data?.theme;            // theme chosen from the tradition (or saved)
          const saved = wedding.inviteTheme || '';
          const showing = pick || saved || auto || 'royal';
          const save = async (key) => {
            setSaving(true);
            try { const r = await weddingApi.update({ inviteTheme: key }); state.setData((s) => ({ ...s, wedding: r.wedding })); setPick(null); toast.success(key ? `${THEMES[key].name} is now your design` : 'Design will follow your tradition'); previewState.reload(); }
            catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
          };
          return (
            <div className="grid gap-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {THEME_ORDER.map((k) => {
                  const t = THEMES[k]; const isSaved = (saved || auto) === k; const isShown = showing === k;
                  return (
                    <button key={k} type="button" onClick={() => setPick(k)} aria-pressed={isShown}
                      className={`rounded-2xl bg-white p-3 text-left transition ${isShown ? 'ring-2 ring-maroon' : 'ring-1 ring-ink/10 hover:ring-maroon/50'}`}>
                      <Swatch t={t} />
                      <div className="mt-3 flex items-center justify-between gap-2"><p className="font-display text-xl text-ink">{t.name}</p>{isSaved && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"><Check size={12} />In use</span>}</div>
                      <p className="mt-0.5 text-xs text-muted">{t.blurb}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
                <p className="mr-auto text-sm text-ink-2">Previewing <b className="font-medium text-ink">{THEMES[showing].name}</b>{!saved && auto && showing === auto && ' (picked automatically from your tradition)'}</p>
                {saved && <Button variant="ghost" size="sm" icon={Wand2} loading={saving} onClick={() => save('')}>Follow my tradition</Button>}
                <Button size="sm" disabled={(saved || auto) === showing} loading={saving} onClick={() => save(showing)}>{(saved || auto) === showing ? 'In use' : 'Use this design'}</Button>
              </div>
              {!events.length ? <EmptyState title="Add events to see the full preview" message="Your RSVP page lists each event with its date, venue and meaning." action={<Button to="/customer/wedding">Add events</Button>} /> : (
                <div className="overflow-hidden rounded-3xl border border-ink/10 shadow-card">
                  <div className="flex items-center gap-2 border-b border-ink/10 bg-white px-4 py-2 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="ml-2">What your guests see</span><ExternalLink size={12} className="ml-auto" /></div>
                  <div className="max-h-[80vh] overflow-y-auto">
                    {previewState.data && <RsvpView key={showing} data={previewState.data} themeKey={showing} preview />}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Async>
    </>
  );
}
