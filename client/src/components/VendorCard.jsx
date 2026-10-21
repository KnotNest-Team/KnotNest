import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, BadgeCheck, GitCompareArrows } from 'lucide-react';
import { Stars } from './StarRating';
import Button from './Button';
import EnquiryModal from './EnquiryModal';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { imgUrl, inr } from '../utils/format';

export default function VendorCard({ vendor, onRemoveFavourite }) {
  const { favourites, toggleFavourite } = useAuth();
  const compare = useCompare();
  const [enquire, setEnquire] = useState(false);
  const fav = favourites.includes(vendor._id);
  const inCompare = compare.has(vendor._id);

  const onHeart = async () => { await toggleFavourite(vendor._id); if (fav) onRemoveFavourite?.(vendor._id); };

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-ink/10 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-24px_rgba(26,20,20,.35)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-ivory-2">
        <Link to={`/vendors/${vendor._id}`} aria-label={`View ${vendor.businessName}`}>
          <img src={imgUrl(vendor.images?.[0])} alt={vendor.businessName} loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-105" />
        </Link>
        <button onClick={onHeart} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} aria-pressed={fav}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-maroon shadow transition hover:scale-110">
          <Heart size={17} className={fav ? 'fill-maroon' : ''} />
        </button>
        <button onClick={() => compare.toggle(vendor._id)} aria-pressed={inCompare}
          className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs shadow transition ${inCompare ? 'bg-maroon text-ivory' : 'bg-white/90 text-ink-2 hover:bg-white'}`}>
          <GitCompareArrows size={13} /> {inCompare ? 'Comparing' : 'Compare'}
        </button>
        {vendor.verified && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-sans text-xs font-medium text-emerald-700 shadow"><BadgeCheck size={14} /> Verified</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{vendor.category?.name}</p>
        <h3 className="mt-1.5 font-display text-[26px] font-medium leading-tight text-ink">
          <Link to={`/vendors/${vendor._id}`} className="hover:text-maroon">{vendor.businessName}</Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1 font-sans text-sm text-muted"><MapPin size={14} /> {[vendor.location, vendor.city].filter(Boolean).join(', ')}</p>
        <div className="mt-3 flex items-center gap-2 font-sans text-sm">
          <Stars value={vendor.rating} /> <b className="text-ink">{vendor.rating ? vendor.rating.toFixed(1) : 'New'}</b>
          <span className="text-muted">({vendor.reviewCount} review{vendor.reviewCount === 1 ? '' : 's'})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="font-sans text-xs text-muted">Starting from<br /><b className="font-display text-2xl font-medium text-maroon">{inr(vendor.startingPrice)}</b></p>
          <div className="flex gap-2">
            <Button to={`/vendors/${vendor._id}`} variant="secondary" size="sm">View Profile</Button>
            <Button size="sm" onClick={() => setEnquire(true)}>Enquire</Button>
          </div>
        </div>
      </div>
      {enquire && <EnquiryModal vendor={vendor} open onClose={() => setEnquire(false)} />}
    </article>
  );
}
