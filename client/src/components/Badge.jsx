import { cx } from '../utils/format';

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20', blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  gray: 'bg-ink/5 text-ink-2 ring-ink/10', maroon: 'bg-maroon/10 text-maroon ring-maroon/20', gold: 'bg-gold/15 text-[#8a6330] ring-gold/30',
};
const STATUS = {
  approved: 'green', confirmed: 'green', accepted: 'green', completed: 'green', published: 'green', active: 'green',
  pending: 'amber', requested: 'amber', contacted: 'blue', converted: 'maroon',
  rejected: 'red', cancelled: 'red', suspended: 'red', hidden: 'gray', inactive: 'gray',
  attending: 'green', pending_review: 'amber', vendor_accepted: 'amber', vendor_declined: 'amber', awaiting_customer: 'gold', declined: 'red', sent: 'green', queued: 'blue', failed: 'red', not_sent: 'gray', paid: 'green', open: 'red', resolved: 'gray',
};
const LABEL = { not_sent: 'not sent', declined: "can't come", pending_review: 'in review', vendor_accepted: 'vendor accepted', vendor_declined: 'vendor declined', awaiting_customer: 'ready to confirm' };

export default function Badge({ tone, status, children, className }) {
  const t = tone || STATUS[status] || 'gray';
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium capitalize ring-1 ring-inset', TONES[t], className)}>{children ?? LABEL[status] ?? status}</span>;
}
