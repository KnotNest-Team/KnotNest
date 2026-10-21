import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, CalendarRange, Clock, IndianRupee, Layers, MessageSquare, Percent, Store, Sun, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/Card';
import { Async } from '../components/States';
import { inr, inrShort } from '../utils/format';
import { DISCOUNT_LABEL, TYPE_LABEL } from '../utils/pricing';
import { statusLabel } from '../utils/bookingStatus';

const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1A141420" />;
const axes = <><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /></>;
const H = ({ children }) => <div className="h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div>;

export default function AdminDashboard() {
  const state = useFetch(() => adminApi.dashboard());
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live numbers from the KnotNest database." />
      <Async state={state}>
        {({ totals: t, growth, popularCategories, popularLocations }) => (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <DashboardCard label="Total Users" icon={Users} value={t.totalUsers} />
              <DashboardCard label="Total Vendors" icon={Store} tone="gold" value={t.totalVendors} />
              <Link to="/admin/approvals"><DashboardCard label="Pending Vendors" icon={Clock} tone="amber" value={t.pendingVendors} hint="Review approvals" /></Link>
              <DashboardCard label="Approved Vendors" icon={UserCheck} tone="green" value={t.approvedVendors} />
              <DashboardCard label="Total Bookings" icon={CalendarCheck} tone="blue" value={t.totalBookings} />
              <DashboardCard label="Total Enquiries" icon={MessageSquare} value={t.totalEnquiries} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="User growth"><H><AreaChart data={growth}>{grid}{axes}<Area dataKey="users" stroke="#6E1E2A" fill="#6E1E2A22" strokeWidth={2} /></AreaChart></H></Card>
              <Card title="Vendor growth"><H><LineChart data={growth}>{grid}{axes}<Line dataKey="vendors" stroke="#B8894A" strokeWidth={3} dot={{ r: 4 }} /></LineChart></H></Card>
              <Card title="Bookings & enquiries"><H><BarChart data={growth}>{grid}{axes}<Legend /><Bar dataKey="bookings" fill="#6E1E2A" radius={[6, 6, 0, 0]} /><Bar dataKey="enquiries" fill="#B8894A" radius={[6, 6, 0, 0]} /></BarChart></H></Card>
              <Card title="Popular categories (by profile views)"><H><BarChart data={popularCategories} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis type="number" tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Bar dataKey="views" fill="#6E1E2A" radius={[0, 6, 6, 0]} /></BarChart></H></Card>
              <Card title="Popular locations (vendors)" className="lg:col-span-2"><H><BarChart data={popularLocations}>{grid}<XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Legend /><Bar dataKey="vendors" fill="#B8894A" radius={[6, 6, 0, 0]} /><Bar dataKey="views" fill="#6E1E2A" radius={[6, 6, 0, 0]} /></BarChart></H></Card>
            </div>
          </div>
        )}
      </Async>
      <BookingStats />
    </>
  );
}

/** Flexible bookings: package vs event bookings, multi-day, discounts granted and final revenue. */
function BookingStats() {
  const state = useFetch(() => adminApi.bookingStats());
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl text-ink">Bookings & discounts</h2>
        <Link to="/admin/discounts" className="text-sm text-maroon hover:underline">Discount rules</Link>
      </div>
      <Async state={state}>
        {({ totals: t, byType, discountByType, status, trend }) => (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <DashboardCard label="Total bookings" icon={CalendarCheck} value={t.bookings} hint={t.olderFormat ? `${t.olderFormat} in the earlier format` : undefined} />
              <DashboardCard label="Full-day packages" icon={Sun} tone="gold" value={t.fullDay} hint="Bookings with at least one entire day" />
              <DashboardCard label="Individual events" icon={Layers} tone="blue" value={t.individualEvents} hint="Bookings with selected events" />
              <DashboardCard label="Multi-day bookings" icon={CalendarRange} tone="amber" value={t.multiDay} />
              <DashboardCard label="Discounts granted" icon={Percent} tone="green" value={inrShort(t.discountsGranted)} hint={`Confirmed and completed · ${inrShort(t.discountsOffered)} on open offers`} />
              <DashboardCard label="Final booking revenue" icon={IndianRupee} value={inrShort(t.revenue)} hint={`List value ${inrShort(t.listValue)}`} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Revenue and discounts by month"><H><BarChart data={trend}>{grid}<XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={60} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Legend /><Bar dataKey="revenue" name="Final revenue" fill="#6E1E2A" radius={[6, 6, 0, 0]} /><Bar dataKey="discounts" name="Discounts" fill="#B8894A" radius={[6, 6, 0, 0]} /></BarChart></H></Card>
              <Card title="Booking types"><H><BarChart data={byType.map((x) => ({ ...x, name: TYPE_LABEL[x.name] || x.name }))} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Bar dataKey="count" name="Bookings" fill="#6E1E2A" radius={[0, 6, 6, 0]} /></BarChart></H></Card>
              <Card title="Booking status"><H><BarChart data={status.map((x) => ({ ...x, name: statusLabel(x.name, 'admin') }))}>{grid}<XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Bar dataKey="count" name="Bookings" fill="#B8894A" radius={[6, 6, 0, 0]} /></BarChart></H></Card>
              <Card title="Discounts granted by type">{discountByType.length ? <H><BarChart data={discountByType.map((x) => ({ ...x, name: DISCOUNT_LABEL[x.name] || x.name }))} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis type="number" tickFormatter={inrShort} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Bar dataKey="amount" name="Discount" fill="#6E1E2A" radius={[0, 6, 6, 0]} /></BarChart></H> : <p className="py-10 text-center text-sm text-muted">No discounts on confirmed bookings yet.</p>}</Card>
            </div>
          </div>
        )}
      </Async>
    </section>
  );
}
