import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Discount rules for flexible wedding bookings (all percentages, editable by the admin).
 * The pricing engine (services/pricingService.js) is the only place these are applied.
 */
export const DISCOUNT_TYPES = ['full_day', 'multi_event', 'multi_day', 'repeat'];
export const DEFAULT_DISCOUNTS = {
  enabled: true,
  fullDay: { enabled: true, percent: 15 },                    // the whole day's eligible events booked as one package
  multiEvent: { enabled: true, tiers: [{ minEvents: 2, percent: 5 }, { minEvents: 3, percent: 10 }] }, // several events on one day (not full day)
  multiDay: { enabled: true, minDays: 2, percent: 10 },       // services on two or more wedding days in one checkout
  repeat: { enabled: true, percent: 5, minPriorBookings: 1 }, // the couple already has confirmed/completed bookings
  // stack: add the eligible discounts (in priority order) up to the cap; best: only the single largest discount applies
  stacking: 'stack',
  priority: ['full_day', 'multi_event', 'multi_day', 'repeat'],
  maxPercent: 20,                                             // total discount never exceeds this share of the eligible subtotal
};

const discountSchema = new Schema({
  enabled: { type: Boolean, default: DEFAULT_DISCOUNTS.enabled },
  fullDay: { enabled: { type: Boolean, default: true }, percent: { type: Number, default: 15, min: 0, max: 100 } },
  multiEvent: {
    enabled: { type: Boolean, default: true },
    tiers: { type: [{ _id: false, minEvents: { type: Number, min: 2, max: 20 }, percent: { type: Number, min: 0, max: 100 } }], default: () => DEFAULT_DISCOUNTS.multiEvent.tiers.map((t) => ({ ...t })) },
  },
  multiDay: { enabled: { type: Boolean, default: true }, minDays: { type: Number, default: 2, min: 2, max: 10 }, percent: { type: Number, default: 10, min: 0, max: 100 } },
  repeat: { enabled: { type: Boolean, default: true }, percent: { type: Number, default: 5, min: 0, max: 100 }, minPriorBookings: { type: Number, default: 1, min: 1, max: 20 } },
  stacking: { type: String, enum: ['stack', 'best'], default: 'stack' },
  priority: { type: [String], default: () => [...DEFAULT_DISCOUNTS.priority] },
  maxPercent: { type: Number, default: 20, min: 0, max: 100 },
}, { _id: false });

/** Platform-wide settings (one document). */
const settingSchema = new Schema({
  key: { type: String, default: 'platform', unique: true },
  // manual: the admin reviews every booking request and every vendor response (managed marketplace).
  // auto_verified: bookings with verified vendors pass straight through; the rest still go to the admin.
  bookingApproval: { type: String, enum: ['manual', 'auto_verified'], default: 'manual' },
  reviewHours: { type: Number, default: 24, min: 1, max: 168 },   // target time for each admin review
  // Full-day packages can be switched off for the whole marketplace (vendors also opt in or out individually)
  fullDayPackages: { type: Boolean, default: true },
  // How long one event holds a vendor when only its start time is known ("7:00 PM onwards")
  eventSlotHours: { type: Number, default: 4, min: 1, max: 24 },
  discounts: { type: discountSchema, default: () => ({}) },
  discountsUpdatedAt: Date,
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

const clone = (x) => JSON.parse(JSON.stringify(x));
/** Fills anything missing (older settings documents) with the defaults. */
export function withDefaults(s = {}) {
  const d = s.discounts || {};
  const discounts = clone(DEFAULT_DISCOUNTS);
  for (const k of ['enabled', 'stacking', 'maxPercent']) if (d[k] !== undefined) discounts[k] = d[k];
  for (const k of ['fullDay', 'multiEvent', 'multiDay', 'repeat']) discounts[k] = { ...discounts[k], ...(d[k] || {}) };
  if (Array.isArray(d.priority) && d.priority.length) discounts.priority = [...d.priority, ...DISCOUNT_TYPES.filter((t) => !d.priority.includes(t))].filter((t) => DISCOUNT_TYPES.includes(t));
  if (!discounts.multiEvent.tiers?.length) discounts.multiEvent.tiers = clone(DEFAULT_DISCOUNTS.multiEvent.tiers);
  discounts.multiEvent.tiers = [...discounts.multiEvent.tiers].sort((a, b) => a.minEvents - b.minEvents);
  return {
    bookingApproval: s.bookingApproval || 'manual', reviewHours: s.reviewHours || 24,
    fullDayPackages: s.fullDayPackages !== false, eventSlotHours: s.eventSlotHours || 4,
    discounts, discountsUpdatedAt: s.discountsUpdatedAt || null,
  };
}

export const getSettings = async () => withDefaults((await Setting.findOne({ key: 'platform' }).lean()) || {});
export default Setting;
