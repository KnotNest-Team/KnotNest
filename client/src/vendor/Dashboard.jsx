import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye, IndianRupee, MessageSquare, CalendarCheck, Star } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { enquiryApi, vendorApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Async } from '../components/States';
import { fmtDate, inr, inrShort } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function VendorDashboard() {
  const { user } = useAuth();
  const state = useFetch(async () => ({ a: await vendorApi.analytics(), e: await enquiryApi.list({ limit: 5 }), v: (await vendorApi.mine()).vendor }));
  return (
    <>
      <PageHeader title="Business Dashboard" subtitle={`Welcome back, ${user.name.split(' ')[0]}. Here's how your business is doing.`} />
      <Async state={state}>
        {({ a, e, v }) => (
          <div className="grid gap-6">
            {v.status !== 'approved' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Your profile is <b>{v.status}</b>. {v.status === 'pending' ? 'It will appear in the marketplace once an admin approves it.' : 'Contact support to discuss next steps.'} <Link to="/vendor/profile" className="underline">Complete your profile</Link> to speed things up.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <DashboardCard label="Profile Views" icon={Eye} tone="blue" value={a.totals.views.toLocaleString('en-IN')} />
              <DashboardCard label="Enquiries" icon={MessageSquare} tone="amber" value={a.totals.enquiries} hint={`${a.totals.pendingEnquiries} pending`} />
              <DashboardCard label="Bookings" icon={CalendarCheck} tone="green" value={a.totals.bookings} />
              <DashboardCard label="Revenue" icon={IndianRupee} tone="gold" value={inrShort(a.totals.revenue)} hint="Confirmed + completed" />
              <DashboardCard label="Rating" icon={Star} value={a.totals.rating ? a.totals.rating.toFixed(1) : '-'} hint={`${a.totals.reviewCount} reviews`} />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card title="Enquiries & bookings (6 months)">
                <div className="h-72"><ResponsiveContainer><BarChart data={a.monthly}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Legend />
                  <Bar dataKey="enquiries" fill="#B8894A" radius={[6, 6, 0, 0]} /><Bar dataKey="bookings" fill="#6E1E2A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </Card>
              <Card title="Recent enquiries" action={<Link to="/vendor/enquiries" className="text-sm text-maroon hover:underline">View all</Link>}>
                {e.enquiries.length === 0 ? <p className="text-sm text-muted">No enquiries yet.</p> : (
                  <ul className="divide-y divide-ink/10">{e.enquiries.map((q) => (
                    <li key={q._id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-ink">{q.name}</p><p className="text-muted">{q.eventType} · {fmtDate(q.createdAt)}</p></div><Badge status={q.status} /></li>
                  ))}</ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </Async>
    </>
  );
}
