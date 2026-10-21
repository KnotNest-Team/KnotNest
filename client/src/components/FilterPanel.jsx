import { SlidersHorizontal, X } from 'lucide-react';
import { Select } from './Field';

const PRICES = [
  { label: 'Any budget', min: '', max: '' }, { label: 'Under ₹25,000', min: '', max: '25000' }, { label: '₹25,000 – ₹1 L', min: '25000', max: '100000' },
  { label: '₹1 L – ₹3 L', min: '100000', max: '300000' }, { label: 'Above ₹3 L', min: '300000', max: '' },
];

/** Controlled by URL params: `f` is an object, `set(patch)` merges and resets to page 1. */
export default function FilterPanel({ f, set, categories = [], cities = [], onClear, className = '' }) {
  const priceIdx = Math.max(0, PRICES.findIndex((p) => p.min === (f.minPrice || '') && p.max === (f.maxPrice || '')));
  return (
    <aside className={`rounded-2xl border border-ink/10 bg-white p-5 font-sans shadow-card ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl text-ink"><SlidersHorizontal size={18} /> Filters</h2>
        <button onClick={onClear} className="flex items-center gap-1 text-xs text-maroon hover:underline"><X size={12} /> Clear all</button>
      </div>
      <div className="grid gap-4">
        <Select label="Category" placeholder="All categories" value={f.category || ''} onChange={(e) => set({ category: e.target.value })} options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
        <Select label="Location" placeholder="All cities" value={f.city || ''} onChange={(e) => set({ city: e.target.value })} options={cities} />
        <Select label="Price" value={priceIdx} onChange={(e) => set({ minPrice: PRICES[e.target.value].min, maxPrice: PRICES[e.target.value].max })} options={PRICES.map((p, i) => ({ value: i, label: p.label }))} />
        <Select label="Minimum rating" value={f.rating || ''} onChange={(e) => set({ rating: e.target.value })} options={[{ value: '', label: 'Any rating' }, { value: '3', label: '3★ & up' }, { value: '4', label: '4★ & up' }, { value: '4.5', label: '4.5★ & up' }]} />
        <label className="block"><span className="kn-label">Available on</span><input type="date" className="kn-input" min={new Date().toISOString().slice(0, 10)} value={f.available || ''} onChange={(e) => set({ available: e.target.value })} /></label>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" checked={f.verified === 'true'} onChange={(e) => set({ verified: e.target.checked ? 'true' : '' })} /> Verified vendors only
        </label>
      </div>
    </aside>
  );
}
