export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-medium leading-none text-ink sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl font-sans text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
