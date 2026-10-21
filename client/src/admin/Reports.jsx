import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { IndianRupee, Percent, Receipt } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import useFetch from '../hooks/useFetch';
import { adminApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Table from '../components/Table';
import { Async, EmptyState } from '../components/States';
import { inr, inrShort } from '../utils/format';

const COLORS = ['#6E1E2A', '#B8894A', '#D9AFA0', '#4A121B', '#D9B57A', '#7A6A62'];
const Donut = ({ data }) => data.length === 0 ? <EmptyState title="No data" /> : (
  <div className="h-64"><ResponsiveContainer><PieChart><Pie data={data} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Legend /></PieChart></ResponsiveContainer></div>
);

export default function Reports() {
  const state = useFetch(() => adminApi.reports());
  return (
    <>
      <PageHeader title="Reports" subtitle="Revenue and pipeline health across the platform." />
      <Async state={state}>
        {(r) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              <DashboardCard label="Platform commission" icon={Percent} value={inrShort(r.earnings.commission)} hint="On bookings with a paid advance" />
              <DashboardCard label="Advances collected" icon={IndianRupee} tone="gold" value={inrShort(r.earnings.advances)} hint="Passed on to vendors" />
              <DashboardCard label="Paid advances" icon={Receipt} tone="green" value={r.earnings.payments} hint={r.earnings.simulated ? `${r.earnings.simulated} simulated in development` : 'Razorpay'} />
            </div>
            <Card title="Commission by month" className="lg:col-span-2">
              <div className="h-56"><ResponsiveContainer><BarChart data={r.earnings.trend}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={60} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Bar dataKey="value" name="Commission" fill="#B8894A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </Card>
            <Card title="Booking value by category" className="lg:col-span-2">
              {r.revenueByCategory.length === 0 ? <EmptyState title="No confirmed bookings yet" /> : <div className="h-72"><ResponsiveContainer><BarChart data={r.revenueByCategory}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1A141420" /><XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={60} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill="#6E1E2A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}
            </Card>
            <Card title="Bookings by status"><Donut data={r.bookingStatus} /></Card>
            <Card title="Enquiries by status"><Donut data={r.enquiryStatus} /></Card>
            <div className="lg:col-span-2"><h2 className="mb-3 font-display text-2xl text-ink">Top-rated vendors</h2>
              <Table rows={r.topVendors} columns={[{ key: 'businessName', header: 'Vendor' }, { key: 'city', header: 'City' }, { key: 'rating', header: 'Rating' }, { key: 'reviewCount', header: 'Reviews' }, { key: 'views', header: 'Profile views' }]} /></div>
          </div>
        )}
      </Async>
    </>
  );
}
