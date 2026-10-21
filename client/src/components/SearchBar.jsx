import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search vendor, service or location', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="w-full rounded-full border border-ink/15 bg-white py-3 pl-11 pr-10 font-sans text-sm text-ink placeholder:text-muted/70 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15" />
      {value && <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-ink/5"><X size={16} /></button>}
    </div>
  );
}
