import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { expenseApi, weddingApi } from '../services/api';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import { Input, Select } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { errMsg, fmtDate, inr, inrShort } from '../utils/format';
import { Wallet, ReceiptIndianRupee, PiggyBank } from 'lucide-react';

export const COLORS = ['#6E1E2A', '#B8894A', '#D9AFA0', '#4A121B', '#D9B57A', '#8C4A55', '#3A2E2A', '#C9A27A', '#A8606C', '#7A6A62', '#E5C9B8'];
const CATS = ['Venue', 'Catering', 'Decoration', 'Photography', 'Makeup', 'Clothing', 'Jewellery', 'Invitations', 'Entertainment', 'Transportation', 'Miscellaneous'];

export default function Budget() {
  const toast = useToast();
  const state = useFetch(() => expenseApi.list());
  const summary = useFetch(() => weddingApi.summary());
  const rsvp = summary.data?.rsvp;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { category: 'Venue', amount: '', description: '', date: new Date().toISOString().slice(0, 10) } });
  const [removing, setRemoving] = useState('');

  const add = async (d) => {
    try { await expenseApi.create({ ...d, amount: Number(d.amount) }); toast.success('Expense added'); reset({ ...d, amount: '', description: '' }); state.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (id) => {
    setRemoving(id);
    try { await expenseApi.remove(id); toast.success('Expense deleted'); state.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setRemoving(''); }
  };

  return (
    <>
      <PageHeader title="Budget Tracker" subtitle="See where every rupee is going. Set your total budget under My Wedding." />
      <Async state={state}>
        {(d) => {
          const over = d.remaining < 0;
          return (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <DashboardCard label="Total Budget" icon={Wallet} value={inr(d.totalBudget)} hint={d.totalBudget ? '' : 'Set it in My Wedding'} />
                <DashboardCard label="Total Spent" icon={ReceiptIndianRupee} tone="gold" value={inr(d.totalSpent)} hint={d.totalBudget ? `${Math.round((d.totalSpent / d.totalBudget) * 100)}% of budget` : ''} />
                <DashboardCard label="Remaining Budget" icon={PiggyBank} tone={over ? 'amber' : 'green'} value={inr(d.remaining)} hint={over ? 'Over budget' : 'Still available'} />
              </div>
              {rsvp?.headcount > 0 && (
                <p className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink-2 shadow-card">
                  <b className="font-medium text-ink">{rsvp.headcount} guests confirmed</b> so far ({rsvp.pending} invitations awaiting reply).
                  {d.totalBudget > 0 && <> Your budget works out to <b className="font-medium text-ink">{inr(Math.round(d.totalBudget / rsvp.headcount))}</b> per confirmed guest.</>}
                  {' '}Share this number with your caterer. <Link to="/customer/guests" className="text-maroon underline">See RSVPs</Link>
                </p>
              )}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Spend by category">
                  {d.byCategory.length === 0 ? <EmptyState title="No expenses yet" message="Add an expense to see the breakdown." /> : (
                    <div className="h-72"><ResponsiveContainer><PieChart>
                      <Pie data={d.byCategory} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={2}>{d.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                      <Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} />
                    </PieChart></ResponsiveContainer></div>
                  )}
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">{d.byCategory.map((c, i) => <li key={c.name} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</li>)}</ul>
                </Card>
                <Card title="Budget vs spent">
                  <div className="h-72"><ResponsiveContainer><BarChart data={[{ name: 'Budget', value: d.totalBudget }, { name: 'Spent', value: d.totalSpent }, { name: 'Remaining', value: Math.max(d.remaining, 0) }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A141420" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={60} />
                    <Tooltip cursor={{ fill: 'rgba(110,30,42,0.06)' }} formatter={(v) => inr(v)} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{[0, 1, 2].map((i) => <Cell key={i} fill={['#B8894A', '#6E1E2A', '#D9AFA0'][i]} />)}</Bar>
                  </BarChart></ResponsiveContainer></div>
                </Card>
              </div>

              <Card title="Add expense">
                <form onSubmit={handleSubmit(add)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_1fr_auto] lg:items-end" noValidate>
                  <Select label="Category" options={CATS} {...register('category')} />
                  <Input label="Amount (₹)" type="number" min="0" error={errors.amount?.message} {...register('amount', { required: 'Enter an amount', min: { value: 1, message: 'Must be above 0' } })} />
                  <Input label="Description" placeholder="e.g. Venue advance" {...register('description')} />
                  <Input label="Date" type="date" {...register('date')} />
                  <Button type="submit" loading={isSubmitting}>Add</Button>
                </form>
              </Card>

              <Table rows={d.expenses} empty={<EmptyState title="No expenses recorded" />} columns={[
                { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'category', header: 'Category' }, { key: 'description', header: 'Description', render: (r) => r.description || '-' },
                { key: 'amount', header: 'Amount', render: (r) => <b className="text-ink">{inr(r.amount)}</b> },
                { key: 'x', header: '', className: 'text-right', render: (r) => <button onClick={() => remove(r._id)} disabled={removing === r._id} aria-label="Delete expense" className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button> },
              ]} />
            </div>
          );
        }}
      </Async>
    </>
  );
}
