import useVendor from './useVendor';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { Async } from '../components/States';
import { fmtDate } from '../utils/format';

export default function Availability() {
  const v = useVendor();
  const toggle = (date) => {
    const cur = v.vendor.unavailableDates || [];
    const next = cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort();
    v.save({ unavailableDates: next }, cur.includes(date) ? 'Date opened' : 'Date blocked');
  };
  return (
    <>
      <PageHeader title="Availability" subtitle="Click a date to block or open it. Confirmed bookings block dates automatically." />
      <Async state={v}>{() => (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card><AvailabilityCalendar unavailable={v.vendor.unavailableDates} onToggle={toggle} /></Card>
          <Card title={`Blocked dates (${v.vendor.unavailableDates.filter((d) => d >= new Date().toISOString().slice(0, 10)).length} upcoming)`}>
            <div className="flex flex-wrap gap-2">
              {v.vendor.unavailableDates.filter((d) => d >= new Date().toISOString().slice(0, 10)).sort().map((d) => <span key={d} className="rounded-full bg-maroon/10 px-3 py-1 text-sm text-maroon">{fmtDate(d)}</span>)}
              {!v.vendor.unavailableDates.length && <p className="text-sm text-muted">You're open every day.</p>}
            </div>
          </Card>
        </div>
      )}</Async>
    </>
  );
}
