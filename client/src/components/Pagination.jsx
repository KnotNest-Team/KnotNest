import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  const base = 'grid h-9 min-w-9 place-items-center rounded-full px-2 font-sans text-sm transition';
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className={`${base} text-ink-2 hover:bg-ink/5 disabled:opacity-30`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
      {nums.map((n, i) => n === '…'
        ? <span key={`e${i}`} className="px-1 text-muted">…</span>
        : <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} className={`${base} ${n === page ? 'bg-maroon text-ivory' : 'text-ink-2 hover:bg-ink/5'}`}>{n}</button>)}
      <button className={`${base} text-ink-2 hover:bg-ink/5 disabled:opacity-30`} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
    </nav>
  );
}
