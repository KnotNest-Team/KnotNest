import { Stars } from './StarRating';
import { fmtDate, imgUrl, initials } from '../utils/format';

export default function ReviewCard({ review }) {
  const name = review.customer?.name || 'Customer';
  return (
    <article className="rounded-xl border border-ink/10 bg-white p-5 font-sans">
      <header className="flex items-center gap-3">
        {review.customer?.profileImage
          ? <img src={imgUrl(review.customer.profileImage)} alt="" className="h-10 w-10 rounded-full object-cover" />
          : <span className="grid h-10 w-10 place-items-center rounded-full bg-maroon/10 font-medium text-maroon">{initials(name)}</span>}
        <div className="flex-1"><p className="text-sm font-medium text-ink">{name}</p><p className="text-xs text-muted">{fmtDate(review.createdAt)}</p></div>
        <Stars value={review.rating} />
      </header>
      <p className="mt-3 font-serif text-[15px] italic leading-relaxed text-ink-2">{review.comment}</p>
      {review.images?.length > 0 && <div className="mt-3 flex gap-2">{review.images.map((u) => <img key={u} src={imgUrl(u)} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
      {review.reply && <div className="mt-4 rounded-lg bg-ivory p-3 text-sm"><b className="text-maroon">Vendor reply: </b><span className="text-ink-2">{review.reply}</span></div>}
    </article>
  );
}
