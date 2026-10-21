import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { categoryApi, locationApi, vendorApi } from '../services/api';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import VendorCard from '../components/VendorCard';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import { Select } from '../components/Field';
import { EmptyState, ErrorState } from '../components/States';

const KEYS = ['search', 'category', 'city', 'minPrice', 'maxPrice', 'rating', 'verified', 'available', 'featured', 'sort', 'page'];

export default function Vendors() {
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const [q, setQ] = useState(f.search);
  const dq = useDebounce(q);
  const [showFilters, setShowFilters] = useState(false);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  useEffect(() => { if (dq !== f.search) set({ search: dq }); /* eslint-disable-next-line */ }, [dq]);
  useEffect(() => { document.title = 'Wedding Vendors | KnotNest'; }, []);

  const meta = useFetch(async () => ({ categories: (await categoryApi.list()).categories, cities: (await locationApi.list()).locations.map((l) => l.city) }), []);
  const result = useFetch(() => vendorApi.list({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), limit: 9 }), [params.toString()]);
  const data = result.data;
  const clear = () => { setQ(''); setParams({}, { replace: true }); };
  const activeCat = meta.data?.categories.find((c) => c.slug === f.category);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-10">
      <header className="mb-8 max-w-3xl">
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold">Vendor marketplace</p>
        <h1 className="mt-3 font-display text-5xl font-normal leading-[0.98] text-ink sm:text-7xl">{activeCat ? activeCat.name : <>Find the people who will make it <em className="text-maroon">yours.</em></>}</h1>
      </header>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar className="flex-1" value={q} onChange={setQ} />
        <Select className="!w-full !rounded-full sm:!w-56" aria-label="Sort" value={f.sort || 'popular'} onChange={(e) => set({ sort: e.target.value })}
          options={[{ value: 'popular', label: 'Sort: Popular' }, { value: 'rating', label: 'Sort: Rating' }, { value: 'price_asc', label: 'Price: low to high' }, { value: 'price_desc', label: 'Price: high to low' }, { value: 'newest', label: 'Newest' }]} />
        <Button variant="secondary" className="lg:hidden" icon={SlidersHorizontal} onClick={() => setShowFilters((s) => !s)}>Filters</Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <FilterPanel className={`${showFilters ? 'block' : 'hidden'} h-fit lg:sticky lg:top-28 lg:block`} f={f} set={set} categories={meta.data?.categories} cities={meta.data?.cities} onClear={clear} />
        <div>
          {result.loading && <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel h-96" />)}</div>}
          {result.error && <ErrorState message={result.error} onRetry={result.reload} />}
          {!result.loading && data && (
            <>
              <p className="mb-5 font-sans text-sm text-muted">{data.total} vendor{data.total === 1 ? '' : 's'} found</p>
              {data.vendors.length === 0
                ? <EmptyState title="No vendors match your search" message="Try removing a filter or searching a different city." action={<Button onClick={clear}>Clear filters</Button>} />
                : <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{data.vendors.map((v) => <VendorCard key={v._id} vendor={v} />)}</div>}
              <Pagination page={data.page} pages={data.pages} onChange={(p) => { set({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
