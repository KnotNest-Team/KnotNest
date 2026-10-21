import { cx } from '../utils/format';

export default function Card({ title, action, children, className, pad = true }) {
  return (
    <section className={cx('rounded-2xl border border-ink/10 bg-white shadow-card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <h3 className="font-display text-xl font-medium text-ink">{title}</h3>{action}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}
