import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, Heart, Mail, MapPin, Globe, Instagram, Facebook, Youtube, Check, GitCompareArrows, MessageSquare } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { chatApi, vendorApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { Stars } from '../components/StarRating';
import Button from '../components/Button';
import Modal from '../components/Modal';
import VendorLogo from '../components/VendorLogo';
import ReviewCard from '../components/ReviewCard';
import EnquiryModal from '../components/EnquiryModal';
import BookingModal from '../components/BookingModal';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { EmptyState, ErrorState, Loader } from '../components/States';
import { imgUrl, inr } from '../utils/format';

const Section = ({ id, title, children }) => (
  <section id={id} className="border-t border-ink/10 py-10 first:border-0 first:pt-0">
    <h2 className="mb-6 font-display text-4xl font-normal text-ink">{title}</h2>{children}
  </section>
);

export default function VendorProfile() {
  const { id } = useParams();
  const { user, favourites, toggleFavourite } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const message = async () => {
    if (!user) return nav('/login', { state: { from: `/vendors/${id}` } });
    if (user.role !== 'customer') return toast.info('Only customer accounts can message vendors.');
    setOpening(true);
    try { const { conversation } = await chatApi.start(id); nav(`/customer/messages?c=${conversation._id}`); } catch (e) { toast.error(errMsg(e)); setOpening(false); }
  };
  const compare = useCompare();
  const state = useFetch(() => vendorApi.one(id), [id]);
  const [enquire, setEnquire] = useState(false);
  const [book, setBook] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const v = state.data?.vendor;
  useEffect(() => { if (v) document.title = `${v.businessName} | KnotNest`; }, [v]);

  if (state.loading) return <Loader className="min-h-[60vh]" />;
  if (state.error) return <div className="mx-auto max-w-xl px-5 py-24"><ErrorState message={state.error} onRetry={state.reload} /><div className="mt-6 text-center"><Button to="/vendors" variant="secondary">Back to vendors</Button></div></div>;

  const fav = favourites.includes(v._id);
  const social = [[v.socialLinks?.website, Globe, 'Website'], [v.socialLinks?.instagram, Instagram, 'Instagram'], [v.socialLinks?.facebook, Facebook, 'Facebook'], [v.socialLinks?.youtube, Youtube, 'YouTube']].filter(([u]) => u);
  const mapQ = encodeURIComponent([v.address || v.location, v.city, v.state, 'India'].filter(Boolean).join(', '));
  const pending = v.status !== 'approved';

  return (
    <div>
      {pending && <div className="bg-amber-100 py-2 text-center font-sans text-sm text-amber-800">This profile is <b>{v.status}</b> and not visible to the public.</div>}
      <div className="relative h-[52vh] min-h-[340px] bg-ink-bg">
        <img src={imgUrl(v.images?.[0])} alt="" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-bg/85 via-ink-bg/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1280px] items-end gap-5 px-5 pb-8 sm:px-10">
          <VendorLogo vendor={v} size={96} />
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.24em] text-gold-lt">{v.category?.name}</p>
            <h1 className="mt-1 font-display text-4xl font-medium leading-none text-ivory sm:text-6xl">{v.businessName}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="-mt-6 relative flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-5 shadow-card md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm text-ink-2">
            {v.verified && <span className="flex items-center gap-1.5 font-medium text-emerald-700"><BadgeCheck size={18} /> Verified</span>}
            <span className="flex items-center gap-2"><Stars value={v.rating} size={16} /><b>{v.rating ? v.rating.toFixed(1) : 'New'}</b><span className="text-muted">({v.reviewCount} reviews)</span></span>
            <span className="flex items-center gap-1.5"><MapPin size={16} /> {[v.location, v.city, v.state].filter(Boolean).join(', ')}</span>
            <span>From <b className="font-display text-2xl font-medium text-maroon">{inr(v.startingPrice)}</b></span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Heart} onClick={() => toggleFavourite(v._id)} aria-pressed={fav} className={fav ? '!border-maroon !text-maroon' : ''}>{fav ? 'Saved' : 'Favourite'}</Button>
            <Button variant="secondary" icon={GitCompareArrows} onClick={() => compare.toggle(v._id)}>{compare.has(v._id) ? 'In compare' : 'Compare'}</Button>
            <Button variant="secondary" icon={MessageSquare} onClick={message} loading={opening} disabled={pending}>Message</Button>
            <Button variant="secondary" icon={Mail} onClick={() => setEnquire(true)} disabled={pending}>Enquire</Button>
            <Button icon={CalendarCheck} onClick={() => setBook(true)} disabled={pending}>Book now</Button>
          </div>
        </div>

        <div className="mt-12">
          <Section id="about" title="About">
            <p className="max-w-3xl whitespace-pre-line font-serif text-lg leading-relaxed text-ink-2">{v.description || 'This vendor has not added a description yet.'}</p>
            {social.length > 0 && <div className="mt-5 flex flex-wrap gap-3">{social.map(([u, Icon, l]) => <a key={l} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-sans text-sm text-ink-2 hover:border-maroon hover:text-maroon"><Icon size={15} /> {l}</a>)}</div>}
          </Section>

          <Section id="portfolio" title="Portfolio">
            {v.images?.length ? (
              <div className="columns-2 gap-4 md:columns-3">
                {v.images.map((u, i) => (
                  <button key={u + i} onClick={() => setLightbox(u)} className="mb-4 block w-full overflow-hidden rounded-lg" aria-label="Open image">
                    <img src={imgUrl(u)} alt="" loading="lazy" className={`w-full object-cover transition duration-700 hover:scale-105 ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-[4/3]'}`} />
                  </button>
                ))}
              </div>
            ) : <EmptyState title="No portfolio images yet" />}
          </Section>

          <Section id="services" title="Services">
            {v.services?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {v.services.map((s) => (
                  <div key={s._id || s.name} className="flex items-start justify-between gap-4 rounded-xl border border-ink/10 bg-white p-5 font-sans">
                    <div><h3 className="font-display text-2xl text-ink">{s.name}</h3>{s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}</div>
                    {s.price > 0 && <p className="shrink-0 text-sm text-muted">from <b className="text-maroon">{inr(s.price)}</b></p>}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No services listed" />}
          </Section>

          <Section id="packages" title="Packages">
            {v.packages?.length ? (
              <div className="grid gap-5 md:grid-cols-3">
                {v.packages.map((p, i) => (
                  <div key={p._id || p.name} className={`flex flex-col rounded-2xl border p-6 font-sans ${i === 1 ? 'border-maroon bg-maroon-dk text-ivory shadow-cta' : 'border-ink/10 bg-white'}`}>
                    <h3 className="font-display text-3xl">{p.name}</h3>
                    <p className={`mt-2 font-display text-4xl ${i === 1 ? 'text-gold-lt' : 'text-maroon'}`}>{inr(p.price)}<span className="text-lg">+</span></p>
                    {p.description && <p className={`mt-2 text-sm ${i === 1 ? 'text-ivory/75' : 'text-muted'}`}>{p.description}</p>}
                    <ul className="mt-5 grid gap-2 text-sm">{p.features?.map((f) => <li key={f} className="flex gap-2"><Check size={16} className={i === 1 ? 'text-gold-lt' : 'text-maroon'} />{f}</li>)}</ul>
                    <Button className="mt-6" variant={i === 1 ? 'gold' : 'secondary'} onClick={() => setBook(true)} disabled={pending}>Choose {p.name}</Button>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No packages listed" />}
          </Section>

          {(v.eventPricing?.length > 0 || v.eventsOffered?.length > 0) && (
            <Section id="event-prices" title="Prices per event">
              <div className="rounded-2xl border border-ink/10 bg-white p-5 font-sans">
                {v.eventPricing?.length > 0 && (
                  <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {v.eventPricing.map((e) => <li key={e.eventName} className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-2 text-sm"><span className="text-ink">{e.eventName}</span><b className="text-maroon">{inr(e.price)}</b></li>)}
                  </ul>
                )}
                <p className="mt-3 text-sm text-muted">
                  {v.eventsOffered?.length ? `Available for: ${v.eventsOffered.join(', ')}. ` : 'Available for every wedding event. '}
                  {v.fullDay?.enabled === false ? 'Books individual events only.' : v.fullDay?.price > 0 ? `Full-day package from ${inr(v.fullDay.price)} (every event on one day).` : 'Book a whole wedding day as a package for a full-day discount, or just the events you need.'}
                </p>
                <Button className="mt-4" size="sm" icon={CalendarCheck} onClick={() => setBook(true)} disabled={pending}>Choose days and events</Button>
              </div>
            </Section>
          )}

          <Section id="availability" title="Availability">
            <AvailabilityCalendar unavailable={v.unavailableDates} />
          </Section>

          <Section id="reviews" title={`Reviews (${v.reviewCount})`}>
            {state.data.reviews.length ? <div className="grid gap-4 md:grid-cols-2">{state.data.reviews.map((r) => <ReviewCard key={r._id} review={r} />)}</div>
              : <EmptyState title="No reviews yet" message="Reviews appear after couples complete a booking with this vendor." />}
          </Section>

          <Section id="location" title="Location">
            <p className="mb-4 flex items-center gap-2 font-sans text-ink-2"><MapPin size={16} /> {v.address || [v.location, v.city].filter(Boolean).join(', ')}</p>
            <iframe title="Map" loading="lazy" className="h-72 w-full rounded-2xl border border-ink/10" src={`https://www.google.com/maps?q=${mapQ}&output=embed`} />
          </Section>
        </div>

        <div className="mb-20 rounded-2xl bg-maroon-dk px-6 py-12 text-center text-ivory">
          <h2 className="font-display text-4xl sm:text-5xl">Love their work? <em className="text-gold-lt">Say hello.</em></h2>
          <p className="mx-auto mt-3 max-w-md font-serif italic text-ivory/80">Send {v.businessName} your date and ideas. Most vendors reply within a day.</p>
          <div className="mt-6 flex justify-center gap-3"><Button variant="gold" onClick={() => setEnquire(true)} disabled={pending}>Send Enquiry</Button><Button to="/vendors" variant="secondary" className="!bg-transparent !text-ivory !border-ivory/30">More vendors</Button></div>
        </div>
      </div>

      {enquire && <EnquiryModal vendor={v} open onClose={() => setEnquire(false)} />}
      {book && <BookingModal vendor={v} open onClose={() => setBook(false)} />}
      <Modal open={!!lightbox} onClose={() => setLightbox(null)} size="xl" title={v.businessName}><img src={imgUrl(lightbox)} alt="" className="mx-auto max-h-[70vh] rounded-lg" /></Modal>
    </div>
  );
}
