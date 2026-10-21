/** Words for each booking stage, as each role should read it. */
const LABELS = {
  customer: { pending_review: 'KnotNest reviewing', requested: 'With vendor', vendor_accepted: 'KnotNest checking reply', vendor_declined: 'KnotNest checking reply', awaiting_customer: 'Ready to confirm', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
  vendor: { requested: 'New request', vendor_accepted: 'You accepted · KnotNest reviewing', vendor_declined: 'You declined', awaiting_customer: 'Waiting for couple', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
  admin: { pending_review: 'Needs review', requested: 'With vendor', vendor_accepted: 'Vendor accepted · review', vendor_declined: 'Vendor declined · review', awaiting_customer: 'With couple', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
};
const TONE = { pending_review: 'amber', requested: 'blue', vendor_accepted: 'amber', vendor_declined: 'amber', awaiting_customer: 'gold', confirmed: 'green', completed: 'maroon', cancelled: 'red' };
export const statusLabel = (s, role = 'customer') => LABELS[role]?.[s] || s;
export const statusTone = (s) => TONE[s] || 'gray';
export const STEP_TEXT = {
  pending_review: 'Request sent to KnotNest', requested: 'Forwarded to the vendor', vendor_accepted: 'Vendor accepted', vendor_declined: 'Vendor declined',
  awaiting_customer: 'Offer sent to the couple', confirmed: 'Couple confirmed', completed: 'Event completed', cancelled: 'Cancelled',
};
export const BY = { customer: 'Couple', vendor: 'Vendor', admin: 'KnotNest', system: 'Automatic' };
