import { Loader } from './States';
import { EmptyState } from './States';

/** columns: [{ key, header, render?(row), className? }] */
export default function Table({ columns, rows, loading, empty, rowKey = '_id' }) {
  if (loading) return <Loader />;
  if (!rows?.length) return empty || <EmptyState title="No records found" />;
  return (
    <div className="kn-scroll overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-card">
      <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm">
        <thead>
          <tr className="border-b border-ink/10 bg-ivory/60 text-xs font-medium uppercase tracking-wider text-muted">
            {columns.map((c) => <th key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.className || ''}`}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[rowKey]} className="border-b border-ink/5 last:border-0 hover:bg-ivory/40">
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle text-ink-2 ${c.className || ''}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
