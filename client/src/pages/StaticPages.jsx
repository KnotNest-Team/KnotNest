import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Compass, Heart, ShieldCheck } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { contentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input, Textarea } from '../components/Field';
import Button from '../components/Button';
import { EmptyState, ErrorState, Loader } from '../components/States';
import { errMsg, imgUrl } from '../utils/format';

const Hero = ({ eyebrow, title, em, children }) => (
  <header className="mx-auto max-w-[1100px] px-5 pb-10 pt-14 sm:px-10">
    <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold">{eyebrow}</p>
    <h1 className="mt-3 font-display text-5xl font-normal leading-[0.98] text-ink sm:text-7xl">{title} <em className="text-maroon">{em}</em></h1>
    {children && <p className="mt-5 max-w-xl font-serif text-lg italic text-muted">{children}</p>}
  </header>
);

export function Inspiration() {
  const { data, loading, error, reload } = useFetch(() => contentApi.home());
  useEffect(() => { document.title = 'Inspiration | KnotNest'; }, []);
  const stories = data?.stories || [];
  return (
    <div className="pb-24">
      <Hero eyebrow="Real weddings" title="Every wedding has a" em="story.">Celebrations from across India, from palace baraats to quiet beach vows.</Hero>
      <div className="mx-auto max-w-[1300px] px-5 sm:px-10">
        {loading && <Loader />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && !stories.length && <EmptyState title="Stories are on their way" />}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {stories.map((s, i) => (
            <Link key={s.slug} to={`/inspiration/${s.slug}`} className="group relative mb-6 block overflow-hidden rounded-md">
              <img src={imgUrl(s.image)} alt={s.couple} loading="lazy" className={`w-full object-cover transition duration-[1400ms] group-hover:scale-105 ${i % 2 ? 'aspect-[4/5]' : 'aspect-[3/4]'}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-bg/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-ivory">
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] opacity-80">{s.city} · {s.date}</p>
                <h2 className="mt-1 font-display text-3xl leading-tight">{s.couple}</h2>
                <p className="font-serif text-sm italic opacity-85">{s.style}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InspirationDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch(() => contentApi.home(), [slug]);
  if (loading) return <Loader className="min-h-[60vh]" />;
  if (error) return <div className="mx-auto max-w-xl py-24"><ErrorState message={error} onRetry={reload} /></div>;
  const s = data.stories?.find((x) => x.slug === slug);
  if (!s) return <div className="mx-auto max-w-xl px-5 py-24"><EmptyState title="Story not found" action={<Button to="/inspiration">All stories</Button>} /></div>;
  return (
    <article className="pb-24">
      <div className="relative h-[60vh] min-h-[340px]"><img src={imgUrl(s.image)} alt={s.couple} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-ink-bg/70 to-transparent" /></div>
      <div className="mx-auto -mt-24 max-w-3xl px-5 sm:px-10">
        <div className="relative rounded-md bg-cream p-8 shadow-card sm:p-12">
          <Link to="/inspiration" className="mb-6 inline-flex items-center gap-2 font-sans text-sm text-muted hover:text-maroon"><ArrowLeft size={16} /> All stories</Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-gold">{s.city} · {s.date} · {s.tag}</p>
          <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">{s.couple}</h1>
          <p className="mt-2 font-serif text-xl italic text-maroon">{s.style}</p>
          <p className="mt-6 font-serif text-lg leading-relaxed text-ink-2">{s.description}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button to="/vendors">Find vendors for your day</Button><Button to="/start-planning" variant="secondary">Plan my wedding</Button></div>
        </div>
      </div>
    </article>
  );
}

export function About() {
  useEffect(() => { document.title = 'About | KnotNest'; }, []);
  const pillars = [[Compass, 'Discover', 'A curated marketplace of verified wedding vendors across India, searchable by city, budget and date.'], [Heart, 'Plan', 'A calm planner for your checklist, budget and bookings, so nothing slips between conversations.'], [ShieldCheck, 'Trust', 'Only couples with completed bookings can review, so every rating on KnotNest is earned.']];
  return (
    <div className="pb-24">
      <Hero eyebrow="About KnotNest" title="A quieter way to plan the loudest," em="brightest days.">KnotNest brings vendors, planning tools and real weddings into one editorial home, made for Indian celebrations.</Hero>
      <div className="mx-auto grid max-w-[1100px] gap-6 px-5 sm:px-10 md:grid-cols-3">
        {pillars.map(([Icon, t, d]) => (
          <div key={t} className="rounded-md border border-ink/10 bg-white p-8">
            <Icon className="text-maroon" size={28} strokeWidth={1.4} />
            <h2 className="mt-5 font-display text-3xl text-ink">{t}</h2>
            <p className="mt-2 font-serif text-ink-2">{d}</p>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-[1100px] px-5 sm:px-10"><img src="/assets/images/exp-wedding.jpg" alt="" className="h-80 w-full rounded-md object-cover" /></div>
    </div>
  );
}

export function Contact() {
  const toast = useToast();
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ values: { name: user?.name || '', email: user?.email || '', subject: '', message: '' } });
  useEffect(() => { document.title = 'Contact | KnotNest'; }, []);
  const submit = async (d) => {
    try { const r = await contentApi.contact(d); toast.success(r.message); reset(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="pb-24">
      <Hero eyebrow="Contact" title="Let's talk about" em="your day.">Questions about KnotNest, or want to partner with us? Send a note and we'll reply soon.</Hero>
      <form onSubmit={handleSubmit(submit)} noValidate className="mx-auto grid max-w-[720px] gap-4 px-5 sm:grid-cols-2 sm:px-10">
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
        <Input wrapClass="sm:col-span-2" label="Subject" {...register('subject')} />
        <Textarea wrapClass="sm:col-span-2" label="Message" rows={6} error={errors.message?.message} {...register('message', { required: 'Please write a message', minLength: { value: 5, message: 'A little more detail, please' } })} />
        <div className="sm:col-span-2"><Button size="lg" loading={isSubmitting} type="submit">Send message</Button></div>
      </form>
    </div>
  );
}

export function NotFound() {
  useEffect(() => { document.title = 'Page not found | KnotNest'; }, []);
  return (
    <div className="grid min-h-[70vh] place-items-center bg-ivory px-5 text-center">
      <div>
        <p className="font-display text-[8rem] italic leading-none text-gold sm:text-[12rem]">404</p>
        <h1 className="font-display text-4xl text-ink sm:text-5xl">This page wandered off.</h1>
        <p className="mt-3 font-serif italic text-muted">Perhaps it's at another ceremony. Let's get you back.</p>
        <div className="mt-8 flex justify-center gap-3"><Button to="/">Home</Button><Button to="/vendors" variant="secondary">Browse vendors</Button></div>
      </div>
    </div>
  );
}

export function Unauthorized() {
  const { user } = useAuth();
  return (
    <div className="grid min-h-[70vh] place-items-center bg-ivory px-5 text-center">
      <div>
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold">Error 403</p>
        <h1 className="mt-3 font-display text-5xl text-ink sm:text-6xl">You don't have access here.</h1>
        <p className="mt-3 font-serif italic text-muted">This area is for a different type of account.</p>
        <div className="mt-8"><Button to={user ? (user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor/dashboard' : '/customer/dashboard') : '/login'}>{user ? 'Go to my dashboard' : 'Log in'}</Button></div>
      </div>
    </div>
  );
}

/** /start-planning: sends logged-in customers to their planner, everyone else to sign-up. */
export function StartPlanning() {
  const { user } = useAuth();
  if (user?.role === 'customer') return <Navigate to="/customer/wedding" replace />;
  if (user) return <Navigate to="/unauthorized" replace />;
  return <Navigate to="/register" replace />;
}
