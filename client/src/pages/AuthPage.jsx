import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth, homeFor } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoryApi } from '../services/api';
import { Input, Select } from '../components/Field';
import Button from '../components/Button';
import { errMsg, fieldErrors } from '../utils/format';

const DEMOS = [['Customer', 'user@knotnest.com', 'User@123'], ['Vendor', 'vendor@knotnest.com', 'Vendor@123'], ['Admin', 'admin@knotnest.com', 'Admin@123']];

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden lg:block">
        <img src="/assets/images/hero-alt.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-bg/80 via-ink-bg/20 to-ink-bg/30" />
        <Link to="/" className="absolute left-10 top-8 font-display text-3xl text-ivory">Knot<em className="text-gold-lt">Nest</em></Link>
        <div className="absolute bottom-12 left-10 right-10 text-ivory">
          <p className="font-display text-5xl leading-[1.02]">Plan Your Perfect <em className="text-gold-lt">Beginning.</em></p>
          <p className="mt-4 max-w-md font-serif italic text-ivory/80">Discover trusted wedding vendors, plan every detail, and turn your wedding vision into reality.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12 font-sans">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 block font-display text-3xl text-ink lg:hidden">Knot<em className="text-maroon">Nest</em></Link>
          <h1 className="font-display text-5xl font-medium leading-none text-ink">{title}</h1>
          <p className="mt-3 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();
  useEffect(() => { document.title = 'Login | KnotNest'; }, []);
  if (user) return <Navigate to={loc.state?.from || homeFor(user.role)} replace />;

  const submit = async (d) => {
    try { const u = await login(d); toast.success(`Welcome back, ${u.name.split(' ')[0]}`); nav(loc.state?.from || homeFor(u.role), { replace: true }); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Shell title="Welcome back" subtitle="Log in to continue planning." footer={<>New to KnotNest? <Link className="font-medium text-maroon hover:underline" to="/register">Create an account</Link></>}>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
        <Button size="lg" loading={isSubmitting} type="submit">Log in</Button>
      </form>
      <div className="mt-6 rounded-xl border border-ink/10 bg-white p-4 text-xs text-muted">
        <p className="mb-2 font-medium text-ink-2">Demo accounts (click to fill)</p>
        <div className="flex flex-wrap gap-2">
          {DEMOS.map(([r, e, p]) => <button key={r} type="button" onClick={() => { setValue('email', e); setValue('password', p); }} className="rounded-full bg-maroon/10 px-3 py-1 text-maroon hover:bg-maroon/20">{r}</button>)}
        </div>
      </div>
    </Shell>
  );
}

export function Register() {
  const { user, register: signup } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'vendor' ? 'vendor' : 'customer');
  const [cats, setCats] = useState([]);
  const [serverErr, setServerErr] = useState({});
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  useEffect(() => { document.title = 'Create account | KnotNest'; categoryApi.list().then((d) => setCats(d.categories)).catch(() => {}); }, []);
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (d) => {
    setServerErr({});
    try {
      const u = await signup({ ...d, role });
      toast.success(role === 'vendor' ? 'Account created. Your profile is pending admin approval.' : 'Welcome to KnotNest!');
      nav(role === 'vendor' ? '/vendor/profile' : '/customer/wedding', { replace: true });
      return u;
    } catch (e) { setServerErr(fieldErrors(e)); toast.error(errMsg(e)); }
  };
  const err = (k) => errors[k]?.message || serverErr[k];

  return (
    <Shell title="Create your account" subtitle="Start planning, or list your business." footer={<>Already have an account? <Link className="font-medium text-maroon hover:underline" to="/login">Log in</Link></>}>
      <div className="mb-5 grid grid-cols-2 rounded-full bg-ink/5 p-1 text-sm" role="tablist">
        {[['customer', "I'm planning a wedding"], ['vendor', "I'm a wedding vendor"]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={role === k} onClick={() => setRole(k)} className={`rounded-full py-2 transition ${role === k ? 'bg-maroon text-ivory shadow' : 'text-ink-2'}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
        <Input label="Full name" error={err('name')} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" error={err('email')} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
          <Input label="Phone" type="tel" error={err('phone')} {...register('phone')} />
        </div>
        <Input label="Password" type="password" hint="At least 6 characters" autoComplete="new-password" error={err('password')} {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} />
        {role === 'vendor' && (
          <>
            <Input label="Business name" error={err('businessName')} {...register('businessName', { required: 'Business name is required' })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" placeholder="Select…" options={cats.map((c) => ({ value: c._id, label: c.name }))} error={err('category')} {...register('category', { required: 'Choose a category' })} />
              <Input label="City" error={err('city')} {...register('city')} />
            </div>
          </>
        )}
        <Button size="lg" loading={isSubmitting} type="submit">{role === 'vendor' ? 'Register business' : 'Create account'}</Button>
      </form>
    </Shell>
  );
}
