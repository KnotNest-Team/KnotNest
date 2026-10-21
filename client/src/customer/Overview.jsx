import { Link } from 'react-router-dom';
import { CalendarHeart, Wallet, CheckCircle2, MessageSquare, MapPin } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { weddingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Async } from '../components/States';
import { daysUntil, fmtDate, inr, inrShort } from '../utils/format';

export default function Overview() {
  const { user } = useAuth();
  const state = useFetch(() => weddingApi.summary());
  return (
    <>
      <PageHeader title={`Namaste, ${user.name.split(' ')[0]}`} subtitle="Here is where your wedding planning stands today." action={<div className="flex flex-wrap gap-2"><Button to="/vendors" variant="secondary">Discover vendors</Button><Button to="/customer/book">Plan & book</Button></div>} />
      <Async state={state}>
        {(d) => {
          const days = daysUntil(d.wedding?.weddingDate);
          return (
            <div className="grid gap-6">
              {!d.wedding && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-maroon-dk p-6 text-ivory">
                  <div><h2 className="font-display text-3xl">Tell us about your wedding</h2><p className="mt-1 text-sm text-ivory/75">Add your date, city and budget to unlock your checklist and budget tracker.</p></div>
                  <Button variant="gold" to="/customer/wedding">Set up my wedding</Button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardCard label="Days Until Wedding" icon={CalendarHeart} value={days === null ? '-' : days < 0 ? 'Done' : days} hint={d.wedding?.weddingDate ? fmtDate(d.wedding.weddingDate) : 'Set your date'} />
                <DashboardCard label="Wedding Budget" icon={Wallet} tone="gold" value={d.wedding?.budget ? inrShort(d.wedding.budget) : '-'} hint={d.wedding?.budget ? `${inr(d.totalSpent)} spent` : 'Not set'} />
                <DashboardCard label="Booked Vendors" icon={CheckCircle2} tone="green" value={d.bookedVendors} hint="Confirmed or completed" />
                <DashboardCard label="Pending Enquiries" icon={MessageSquare} tone="amber" value={d.pendingEnquiries} hint="Awaiting vendor reply" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Planning progress" action={<Link to="/customer/checklist" className="text-sm text-maroon hover:underline">Open checklist</Link>}>
                  <div className="flex items-end justify-between"><p className="font-display text-6xl text-maroon">{d.checklist.percent}%</p><p className="pb-2 text-sm text-muted">{d.checklist.done} of {d.checklist.total} tasks done</p></div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gradient-to-r from-maroon to-gold transition-all duration-700" style={{ width: `${d.checklist.percent}%` }} /></div>
                </Card>
                <Card title="Guest RSVPs" action={<Link to="/customer/guests" className="text-sm text-maroon hover:underline">Open guest list</Link>}>
                  {d.rsvp.invited === 0 ? <p className="text-sm text-muted">No guests yet. <Link className="text-maroon underline" to="/customer/guests">Start your guest list</Link> and send invitations with an RSVP link.</p> : (<>
                    <div className="flex items-end justify-between"><p className="font-display text-6xl text-emerald-700">{d.rsvp.headcount}</p><p className="pb-2 text-sm text-muted">people coming from {d.rsvp.invited} invitations</p></div>
                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                      <div className="bg-emerald-500" style={{ width: `${(d.rsvp.attending / d.rsvp.invited) * 100}%` }} /><div className="bg-red-300" style={{ width: `${(d.rsvp.declined / d.rsvp.invited) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-ink-2">{d.rsvp.attending} accepted · {d.rsvp.declined} can't come · {d.rsvp.pending} awaiting reply</p>
                  </>)}
                </Card>
                <Card title="Your events" action={<Link to="/customer/wedding" className="text-sm text-maroon hover:underline">Manage events</Link>}>
                  {d.events.length === 0 ? <p className="text-sm text-muted">Add haldi, sangeet, wedding and reception with their dates and venues. <Link className="text-maroon underline" to="/customer/wedding">Add events</Link>.</p> : (
                    <ul className="divide-y divide-ink/10">{d.events.slice(0, 5).map((e) => (
                      <li key={e._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0"><p className="font-medium text-ink">{e.name} <span className="font-normal text-muted">· {fmtDate(e.date)}</span></p>{e.venueName ? <p className="flex items-center gap-1 truncate text-muted"><MapPin size={12} />{e.venueName}</p> : <p className="text-amber-700">Venue not added</p>}</div>
                      </li>))}</ul>
                  )}
                </Card>
                <Card title="Upcoming bookings" action={<Link to="/customer/bookings" className="text-sm text-maroon hover:underline">All bookings</Link>}>
                  {d.upcoming.length === 0 ? <p className="text-sm text-muted">No upcoming bookings. <Link className="text-maroon underline" to="/vendors">Find a vendor</Link>.</p> : (
                    <ul className="divide-y divide-ink/10">
                      {d.upcoming.map((b) => (
                        <li key={b._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                          <div><p className="font-medium text-ink">{b.vendor?.businessName}</p><p className="text-muted">{fmtDate(b.weddingDate)} · {b.eventType}</p></div>
                          <Badge status={b.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          );
        }}
      </Async>
    </>
  );
}
