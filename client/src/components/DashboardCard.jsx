export default function DashboardCard({ label, value, icon: Icon, hint, tone = 'maroon' }) {
  const tones = { maroon: 'bg-maroon/10 text-maroon', gold: 'bg-gold/15 text-[#8a6330]', green: 'bg-emerald-50 text-emerald-700', blue: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700' };
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="font-sans text-sm text-muted">{label}</p>
        {Icon && <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={20} /></span>}
      </div>
      <p className="mt-3 font-display text-4xl font-medium leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 font-sans text-xs text-muted">{hint}</p>}
    </div>
  );
}
