import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ImageUploader from '../components/ImageUploader';
import { Input, Textarea } from '../components/Field';
import { Async } from '../components/States';
import { errMsg } from '../utils/format';

const slugify = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Generic editable list of objects. fields: [{key,label,type:'text'|'textarea'|'number'|'image'|'checkbox', wide?}] */
function RowsEditor({ rows, onChange, fields, blank, title }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="grid gap-4">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-ink/10 bg-ivory/40 p-4">
          <div className="mb-3 flex items-center justify-between"><p className="font-display text-xl text-ink">{title(r, i)}</p><button type="button" onClick={() => onChange(rows.filter((_, k) => k !== i))} aria-label="Remove" className="rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => {
              const wide = f.wide ? 'sm:col-span-2 lg:col-span-3' : '';
              if (f.type === 'image') return <div key={f.key} className={wide}><ImageUploader kind="content" label={f.label} value={r[f.key]} onChange={(u) => set(i, f.key, u)} /></div>;
              if (f.type === 'textarea') return <Textarea key={f.key} wrapClass={wide} label={f.label} rows={3} value={r[f.key] || ''} onChange={(e) => set(i, f.key, e.target.value)} />;
              if (f.type === 'checkbox') return <label key={f.key} className="flex items-center gap-2 self-end pb-3 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={!!r[f.key]} onChange={(e) => set(i, f.key, e.target.checked)} /> {f.label}</label>;
              return <Input key={f.key} wrapClass={wide} label={f.label} type={f.type === 'number' ? 'number' : 'text'} step="any" value={r[f.key] ?? ''} onChange={(e) => set(i, f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />;
            })}
          </div>
        </div>
      ))}
      <div><Button variant="secondary" icon={Plus} onClick={() => onChange([...rows, { ...blank }])}>Add item</Button></div>
    </div>
  );
}

const LIST_SECTIONS = {
  stories: { label: 'Real weddings', blank: { slug: '', couple: '', city: '', date: '', style: '', tag: '', image: '', description: '' }, title: (r) => r.couple || 'New story',
    fields: [{ key: 'couple', label: 'Couple (e.g. Aarav & Riya)' }, { key: 'city', label: 'City' }, { key: 'date', label: 'Date (e.g. Dec 2025)' }, { key: 'style', label: 'Style' }, { key: 'tag', label: 'Tag' }, { key: 'slug', label: 'URL slug (auto if empty)' }, { key: 'image', label: 'Image', type: 'image' }, { key: 'description', label: 'Story', type: 'textarea', wide: true }] },
  testimonials: { label: 'Testimonials', blank: { couple: '', city: '', date: '', rating: 5, quote: '', photo: '' }, title: (r) => r.couple || 'New testimonial',
    fields: [{ key: 'couple', label: 'Couple' }, { key: 'city', label: 'City' }, { key: 'date', label: 'Date' }, { key: 'rating', label: 'Rating (1-5)', type: 'number' }, { key: 'photo', label: 'Photo', type: 'image' }, { key: 'quote', label: 'Quote', type: 'textarea', wide: true }] },
  experiences: { label: 'Video tiles', blank: { title: '', desc: '', tag: '', image: '', videoUrl: '' }, title: (r) => r.title || 'New tile',
    fields: [{ key: 'title', label: 'Title (e.g. The Wedding)' }, { key: 'tag', label: 'Tag' }, { key: 'videoUrl', label: 'Video URL (mp4, optional)' }, { key: 'desc', label: 'Description', wide: true }, { key: 'image', label: 'Poster image', type: 'image' }] },
  offers: { label: 'Offers', blank: { title: '', description: '', code: '', validTill: '', image: '' }, title: (r) => r.title || 'New offer',
    fields: [{ key: 'title', label: 'Title' }, { key: 'code', label: 'Code' }, { key: 'validTill', label: 'Valid till' }, { key: 'description', label: 'Description', type: 'textarea', wide: true }, { key: 'image', label: 'Image', type: 'image' }] },
  banners: { label: 'Promo banners', blank: { title: '', subtitle: '', image: '', link: '/vendors', active: true }, title: (r) => r.title || 'New banner',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle' }, { key: 'link', label: 'Link' }, { key: 'active', label: 'Active (first active banner is shown)', type: 'checkbox' }, { key: 'image', label: 'Image', type: 'image' }] },
  trust: { label: 'Trust numbers', blank: { label: '', to: 0, suffix: '+', decimals: 0 }, title: (r) => r.label || 'New number',
    fields: [{ key: 'label', label: 'Label' }, { key: 'to', label: 'Value', type: 'number' }, { key: 'suffix', label: 'Suffix (e.g. + or " / 5")' }, { key: 'decimals', label: 'Decimals', type: 'number' }] },
};
const TABS = ['hero', ...Object.keys(LIST_SECTIONS), 'featuredVendors', 'google'];
const TAB_LABEL = { hero: 'Hero banner', featuredVendors: 'Featured vendors', google: 'Google reviews', ...Object.fromEntries(Object.entries(LIST_SECTIONS).map(([k, v]) => [k, v.label])) };

export default function Homepage() {
  const toast = useToast();
  const state = useFetch(() => adminApi.content());
  const vendors = useFetch(() => adminApi.vendors({ status: 'approved', limit: 100 }));
  const [tab, setTab] = useState('hero');
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (state.data) setDraft(JSON.parse(JSON.stringify(state.data.content))); }, [state.data]);

  const save = async (key) => {
    let value = draft[key];
    if (key === 'stories') value = value.map((s) => ({ ...s, slug: slugify(s.slug || s.couple) }));
    if (key === 'hero') value = { ...value, titleLines: (value.titleLines || []).filter(Boolean) };
    setBusy(true);
    try { await adminApi.updateContent({ [key]: value }); toast.success(`${TAB_LABEL[key]} saved. The homepage is updated.`); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const SaveBar = ({ k }) => <div className="mt-6"><Button loading={busy} onClick={() => save(k)}>Save {TAB_LABEL[k].toLowerCase()}</Button></div>;
  const hero = draft.hero || {};
  const setHero = (p) => setDraft({ ...draft, hero: { ...hero, ...p } });
  const featured = (draft.featuredVendors || []).map(String);

  return (
    <>
      <PageHeader title="Homepage" subtitle="Everything couples see on the landing page. Each section saves independently." />
      <div className="mb-6 flex flex-wrap gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-maroon text-ivory' : 'bg-white text-ink-2 ring-1 ring-ink/10 hover:ring-maroon'}`}>{TAB_LABEL[t]}</button>)}</div>
      <Async state={state}>
        {() => (
          <Card className="max-w-5xl">
            {tab === 'hero' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Textarea label="Headline (one line per row; the last line is italic)" rows={3} value={(hero.titleLines || []).join('\n')} onChange={(e) => setHero({ titleLines: e.target.value.split('\n') })} />
                <Textarea label="Subheading" rows={3} value={hero.subtitle || ''} onChange={(e) => setHero({ subtitle: e.target.value })} />
                <Input label="Story label: couple" value={hero.storyLabel?.couple || ''} onChange={(e) => setHero({ storyLabel: { ...hero.storyLabel, couple: e.target.value } })} />
                <div className="grid grid-cols-2 gap-4"><Input label="City" value={hero.storyLabel?.city || ''} onChange={(e) => setHero({ storyLabel: { ...hero.storyLabel, city: e.target.value } })} /><Input label="Date" value={hero.storyLabel?.date || ''} onChange={(e) => setHero({ storyLabel: { ...hero.storyLabel, date: e.target.value } })} /></div>
                <ImageUploader kind="content" label="Hero image (also the video poster)" value={hero.image} onChange={(image) => setHero({ image })} />
                <Input label="Hero video URL (mp4, optional)" hint="Host the file on your server or a CDN. Leave empty to show the image only." value={hero.videoUrl || ''} onChange={(e) => setHero({ videoUrl: e.target.value })} />
                <div className="sm:col-span-2"><p className="kn-label">Hero stats</p><RowsEditor rows={hero.stats || []} onChange={(stats) => setHero({ stats })} blank={{ value: '', label: '' }} title={(r) => r.label || 'Stat'} fields={[{ key: 'value', label: 'Value (e.g. 1,000+)' }, { key: 'label', label: 'Label' }]} /></div>
                <div className="sm:col-span-2"><SaveBar k="hero" /></div>
              </div>
            )}
            {LIST_SECTIONS[tab] && <><RowsEditor rows={draft[tab] || []} onChange={(rows) => setDraft({ ...draft, [tab]: rows })} {...LIST_SECTIONS[tab]} /><SaveBar k={tab} /></>}
            {tab === 'featuredVendors' && (
              <>
                <p className="mb-4 text-sm text-muted">Choose up to 6 vendors for the homepage. If none are chosen, vendors marked "featured" are used.</p>
                <Async state={vendors}>{({ vendors: list }) => (
                  <div className="grid gap-2 sm:grid-cols-2">{list.map((v) => (
                    <label key={v._id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink/10 px-3 py-2.5 text-sm hover:bg-ivory/50">
                      <input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={featured.includes(v._id)} disabled={!featured.includes(v._id) && featured.length >= 6}
                        onChange={(e) => setDraft({ ...draft, featuredVendors: e.target.checked ? [...featured, v._id] : featured.filter((x) => x !== v._id) })} />
                      <span className="flex-1">{v.businessName}</span><span className="text-xs text-muted">{v.category?.name}</span>
                    </label>))}</div>
                )}</Async>
                <SaveBar k="featuredVendors" />
              </>
            )}
            {tab === 'google' && (
              <div className="grid max-w-md gap-4">
                <p className="text-sm text-muted">Shown under the testimonials. Only enter numbers that match your real Google Business profile.</p>
                <Input label="Rating (0-5)" type="number" step="0.1" value={draft.google?.rating ?? ''} onChange={(e) => setDraft({ ...draft, google: { ...draft.google, rating: Number(e.target.value) } })} />
                <Input label="Review count" type="number" value={draft.google?.count ?? ''} onChange={(e) => setDraft({ ...draft, google: { ...draft.google, count: Number(e.target.value) } })} />
                <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={!!draft.google?.visible} onChange={(e) => setDraft({ ...draft, google: { ...draft.google, visible: e.target.checked } })} /> Show on homepage</label>
                <SaveBar k="google" />
              </div>
            )}
          </Card>
        )}
      </Async>
    </>
  );
}
