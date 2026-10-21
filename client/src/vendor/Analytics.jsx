import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useFetch from '../hooks/useFetch';
import { vendorApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { Async } from '../components/States';
import { inr, inrShort } from '../utils/format';

const Chart = ({ children, data }) => <div className="h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div>;
const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1A141420" />;

export default function Analytics() {
  const state = useFetch(() => vendorApi.analytics());
  return (
    <>
      <PageHeader title="Analytics" subtitle="Views, enquiries, bookings and revenue." />
      <Async state={state}>
        {(a) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Profile views (14 days)"><Chart><AreaChart data={a.viewsByDay}>{grid}<XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Area dataKey="views" stroke="#6E1E2A" fill="#6E1E2A22" strokeWidth={2} /></AreaChart></Chart></Card>
            <Card title="Revenue (6 months)"><Chart><LineChart data={a.monthly}>{grid}<XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={55} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Line dataKey="revenue" stroke="#B8894A" strokeWidth={3} dot={{ r: 4 }} /></LineChart></Chart></Card>
            <Card title="Enquiries vs bookings" className="lg:col-span-2"><Chart><BarChart data={a.monthly}>{grid}<XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} /><Legend /><Bar dataKey="enquiries" fill="#B8894A" radius={[6, 6, 0, 0]} /><Bar dataKey="bookings" fill="#6E1E2A" radius={[6, 6, 0, 0]} /></BarChart></Chart></Card>
          </div>
        )}
      </Async>
    </>
  );
}
