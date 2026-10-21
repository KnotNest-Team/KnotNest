import { Loader2, Inbox, AlertTriangle } from 'lucide-react';
import Button from './Button';

export const Loader = ({ label = 'Loading…', className = '' }) => (
  <div className={`flex items-center justify-center gap-3 py-16 font-sans text-sm text-muted ${className}`} role="status">
    <Loader2 className="animate-spin text-maroon" size={20} /> {label}
  </div>
);

export const PageLoader = () => (
  <div className="grid min-h-screen place-items-center bg-ivory"><Loader label="Loading KnotNest…" /></div>
);

export const EmptyState = ({ title = 'Nothing here yet', message, action, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 bg-white/50 px-6 py-14 text-center font-sans">
    <span className="grid h-14 w-14 place-items-center rounded-full bg-maroon/10 text-maroon"><Icon size={26} /></span>
    <h4 className="mt-4 font-display text-2xl text-ink">{title}</h4>
    {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center font-sans">
    <AlertTriangle className="text-red-600" size={28} />
    <p className="mt-3 text-sm text-red-700">{message}</p>
    {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
  </div>
);

/** Renders loader / error / empty / content from a useFetch result. */
export function Async({ state, empty, isEmpty, children }) {
  if (state.loading) return <Loader />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (isEmpty?.(state.data)) return empty;
  return children(state.data);
}
