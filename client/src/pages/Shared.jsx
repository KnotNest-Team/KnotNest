import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { authApi, notificationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ImageUploader from '../components/ImageUploader';
import { Input } from '../components/Field';
import { Async, EmptyState } from '../components/States';
import { errMsg, fmtDate } from '../utils/format';

/** Used by customer, vendor and admin areas. */
export function NotificationsPage() {
  const toast = useToast();
  const state = useFetch(() => notificationApi.list());
  const act = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); state.reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <>
      <PageHeader title="Notifications" subtitle="Enquiries, bookings and updates, in one place." action={<Button variant="secondary" icon={CheckCheck} onClick={() => act(notificationApi.readAll, 'All marked as read')}>Mark all read</Button>} />
      <Async state={state} isEmpty={(d) => !d.notifications.length} empty={<EmptyState icon={Bell} title="You're all caught up" message="New activity will show up here." />}>
        {({ notifications }) => (
          <ul className="grid max-w-3xl gap-2">
            {notifications.map((n) => (
              <li key={n._id} className={`flex items-start gap-3 rounded-xl border p-4 ${n.isRead ? 'border-ink/10 bg-white' : 'border-maroon/30 bg-maroon/5'}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? 'bg-ink/20' : 'bg-maroon'}`} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink">{n.title}</p><p className="text-ink-2">{n.message}</p>
                  <p className="mt-1 flex gap-3 text-xs text-muted">{fmtDate(n.createdAt)}{n.link && <Link to={n.link} onClick={() => !n.isRead && notificationApi.read(n._id)} className="text-maroon hover:underline">Open</Link>}{!n.isRead && <button onClick={() => act(() => notificationApi.read(n._id))} className="hover:text-maroon">Mark read</button>}</p>
                </div>
                <button onClick={() => act(() => notificationApi.remove(n._id))} aria-label="Delete notification" className="rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: user.name, phone: user.phone || '', profileImage: user.profileImage || '' } });
  const save = async (d) => { try { const r = await authApi.updateMe(d); setUser({ ...user, ...r.user }); toast.success('Profile updated'); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <>
      <PageHeader title="Profile" subtitle="How you appear to vendors and on reviews." />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(save)} className="grid gap-5" noValidate>
          <ImageUploader kind="profile" round label="Profile photo" value={watch('profileImage')} onChange={(u) => setValue('profileImage', u, { shouldDirty: true })} />
          <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} />
          <Input label="Email" value={user.email} disabled hint="Email cannot be changed" readOnly />
          <Input label="Phone" type="tel" {...register('phone')} />
          <div><Button type="submit" loading={isSubmitting}>Save profile</Button></div>
        </form>
      </Card>
    </>
  );
}

export function SettingsPage() {
  const toast = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const save = async (d) => { try { await authApi.changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword }); toast.success('Password updated'); reset(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <>
      <PageHeader title="Settings" subtitle="Security and account preferences." />
      <Card title="Change password" className="max-w-xl">
        <form onSubmit={handleSubmit(save)} className="grid gap-4" noValidate>
          <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Required' })} />
          <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword', { required: 'Required', minLength: { value: 6, message: 'At least 6 characters' } })} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm', { validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} />
          <div><Button type="submit" loading={isSubmitting}>Update password</Button></div>
        </form>
      </Card>
    </>
  );
}
