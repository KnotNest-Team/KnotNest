import { Link } from 'react-router-dom';
import { Check, Minus, X } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { favouriteApi, vendorApi } from '../services/api';
import { useCompare } from '../context/CompareContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { Stars } from '../components/StarRating';
import { Async, EmptyState, Loader } from '../components/States';
import { imgUrl, inr } from '../utils/format';

export default function Compare() {
  const compare = useCompare();
  const state = useFetch(() => (compare.ids.length ? vendorApi.compare(compare.ids) : Promise.resolve({ vendors: [] })), [compare.ids.join(',')]);
  const favs = useFetch(() => favouriteApi.list());

  const rows = [
    ['Category', (v) => v.category?.name], ['Location', (v) => [v.location, v.city].filter(Boolean).join(', ')],
    ['Rating', (v) => <span className="inline-flex items-center gap-2"><Stars value={v.rating} /> {v.rating ? v.rating.toFixed(1) : 'New'}</span>],
    ['Reviews', (v) => v.reviewCount], ['Starting price', (v) => <b className="text-maroon">{inr(v.startingPrice)}</b>],
    ['Verified', (v) => (v.verified ? <Check className="text-emerald-600" size={18} /> : <Minus className="text-muted" size={18} />)],
    ['Services', (v) => <ul className="grid gap-1">{v.services?.map((s) => <li key={s.name}>{s.name}</li>)}</ul>],
    ['Packages', (v) => <ul className="grid gap-1">{v.packages?.map((p) => <li key={p.name}><b>{p.name}</b> {inr(p.price)}+</li>)}</ul>],
    ['Next available', (v) => { const t = new Set(v.unavailableDates); for (let i = 1; i < 366; i++) { const d = new Date(Date.now() + i * 864e5).toISOString().slice(0, 10); if (!t.has(d)) return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } return '-'; }],
  ];
  const suggestions = (favs.data?.favourites || []).filter((v) => !compare.has(v._id));

  return (
    <>
      <PageHeader title="Compare Vendors" subtitle="Up to four vendors, side by side." action={compare.ids.length > 0 && <Button variant="secondary" onClick={compare.clear}>Clear all</Button>} />
      {suggestions.length > 0 && compare.ids.length < 4 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm"><span className="text-muted">Add from favourites:</span>
          {suggestions.map((v) => <button key={v._id} onClick={() => compare.toggle(v._id)} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-ink/10 hover:ring-maroon">+ {v.businessName}</button>)}
        </div>
      )}
      <Async state={state} isEmpty={(d) => !d.vendors.length} empty={<EmptyState title="Nothing to compare yet" message="Tap 'Compare' on vendor cards to add them here." action={<Button to="/vendors">Browse vendors</Button>} />}>
        {({ vendors }) => (
          <div className="kn-scroll overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-card">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="w-40 bg-ivory/60 p-4" />
                  {vendors.map((v) => (
                    <th key={v._id} className="relative min-w-[200px] border-l border-ink/10 p-4 align-top font-normal">
                      <button onClick={() => compare.toggle(v._id)} aria-label={`Remove ${v.businessName}`} className="absolute right-2 top-2 rounded-full p-1 text-muted hover:bg-ink/5"><X size={15} /></button>
                      <img src={imgUrl(v.images?.[0])} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" />
                      <Link to={`/vendors/${v._id}`} className="font-display text-2xl leading-tight text-ink hover:text-maroon">{v.businessName}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, fn]) => (
                  <tr key={label} className="border-t border-ink/10">
                    <th className="bg-ivory/60 p-4 text-left text-xs font-medium uppercase tracking-wider text-muted">{label}</th>
                    {vendors.map((v) => <td key={v._id} className="border-l border-ink/10 p-4 align-top text-ink-2">{fn(v)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-ink/10"><th className="bg-ivory/60 p-4" />{vendors.map((v) => <td key={v._id} className="border-l border-ink/10 p-4"><Button size="sm" to={`/vendors/${v._id}`}>View & enquire</Button></td>)}</tr>
              </tbody>
            </table>
          </div>
        )}
      </Async>
      {state.loading && <Loader />}
    </>
  );
}
