import { NavLink } from 'react-router-dom';

const THEMES = {
  customer: { bg: 'bg-cream border-r border-ink/10', link: 'text-ink-2 hover:bg-maroon/5', active: 'bg-maroon text-ivory hover:bg-maroon', brand: 'text-ink', em: 'text-maroon', head: 'text-muted' },
  vendor: { bg: 'bg-maroon-dk text-ivory', link: 'text-ivory/75 hover:bg-white/10', active: 'bg-gold text-white hover:bg-gold', brand: 'text-ivory', em: 'text-gold-lt', head: 'text-ivory/50' },
  admin: { bg: 'bg-ink-bg text-ivory', link: 'text-ivory/70 hover:bg-white/10', active: 'bg-maroon text-ivory hover:bg-maroon', brand: 'text-ivory', em: 'text-gold-lt', head: 'text-ivory/40' },
};

export default function Sidebar({ items, variant = 'customer', badge, onNavigate, subtitle }) {
  const t = THEMES[variant];
  return (
    <aside className={`flex h-full w-64 flex-col ${t.bg}`}>
      <NavLink to="/" onClick={onNavigate} className={`flex flex-col px-6 pb-4 pt-6 ${t.brand}`}>
        <span className="font-display text-3xl font-medium leading-none">Knot<em className={`font-normal ${t.em}`}>Nest</em></span>
        <span className={`mt-2 font-sans text-[11px] uppercase tracking-[0.24em] ${t.head}`}>{subtitle}</span>
      </NavLink>
      <nav className="kn-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3 font-sans text-sm">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${isActive ? t.active : t.link}`}>
            <it.icon size={18} strokeWidth={1.6} /> <span className="flex-1">{it.label}</span>
            {badge?.[it.label] > 0 && <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-medium text-white">{badge[it.label]}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
