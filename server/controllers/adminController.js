import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';
import Review from '../models/Review.js';
import Wedding from '../models/Wedding.js';
import Expense from '../models/Expense.js';
import Guest from '../models/Guest.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, pageParams, pick } from '../utils/validate.js';
import { searchVendors } from '../services/vendorService.js';
import { adminDashboard, adminReports } from '../services/statsService.js';

export const dashboard = asyncHandler(async (_req, res) => res.json(await adminDashboard()));
export const reports = asyncHandler(async (_req, res) => res.json(await adminReports()));

export const users = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.isActive = req.query.status === 'active';
  if (req.query.search) { const rx = new RegExp(escapeRegex(req.query.search), 'i'); filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
  const { page, limit, skip } = pageParams(req.query, 15);
  const [list, total] = await Promise.all([User.find(filter).sort('-createdAt').skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ users: list, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const userDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const [bookings, enquiries, wedding] = await Promise.all([
    Booking.countDocuments({ customer: user._id }), Enquiry.countDocuments({ customer: user._id }), Wedding.findOne({ customer: user._id }),
  ]);
  res.json({ user, stats: { bookings, enquiries }, wedding });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const data = pick(req.body, ['name', 'phone', 'role', 'isActive']);
  if (String(user._id) === String(req.user._id) && (data.isActive === false || (data.role && data.role !== 'admin')))
    throw ApiError.badRequest('You cannot suspend or demote your own admin account');
  if (data.role && !['customer', 'vendor', 'admin'].includes(data.role)) throw ApiError.badRequest('Invalid role');
  Object.assign(user, data);
  await user.save();
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  await user.deleteOne();
  const vendorIds = user.role === 'vendor' ? (await Vendor.find({ owner: user._id }).select('_id').lean()).map((v) => v._id) : [];
  const convs = await Conversation.find(user.role === 'vendor' ? { vendor: { $in: vendorIds } } : { customer: user._id }).select('_id').lean();
  await Promise.all([
    Wedding.deleteOne({ customer: user._id }), Expense.deleteMany({ customer: user._id }),
    Guest.deleteMany({ customer: user._id }), // guest list personal data goes with the account
    Message.deleteMany({ conversation: { $in: convs.map((c) => c._id) } }), Conversation.deleteMany({ _id: { $in: convs.map((c) => c._id) } }),
    // a vendor account takes its business profile with it, so no orphaned listings stay in the marketplace
    user.role === 'vendor' ? Vendor.deleteMany({ owner: user._id }) : null,
  ]);
  res.json({ message: 'User deleted' });
});

export const vendors = asyncHandler(async (req, res) => res.json(await searchVendors(req.query, { includeAll: true })));

export const bookings = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  if (req.query.type) filter.bookingType = String(req.query.type);
  const { page, limit, skip } = pageParams(req.query, 20);
  const [list, total] = await Promise.all([
    Booking.find(filter).populate('vendor', 'businessName city').populate('customer', 'name email').sort('-createdAt').skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  res.json({ bookings: list, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const enquiries = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const { page, limit, skip } = pageParams(req.query, 20);
  const [list, total] = await Promise.all([
    Enquiry.find(filter).populate('vendor', 'businessName city').populate('customer', 'name email').select('-message -response -report.reason').sort('-createdAt').skip(skip).limit(limit).lean(),
    Enquiry.countDocuments(filter),
  ]);
  // Message text stays private: admins see who, which vendor, when and status. Reported ones open from Safety.
  res.json({ enquiries: list.map((e) => ({ ...e, messagePrivate: true })), total, page, pages: Math.ceil(total / limit) || 1 });
});

export const reviewsStats = asyncHandler(async (_req, res) => res.json({ reported: await Review.countDocuments({ reported: true }) }));

// ---- platform settings (booking approval mode, full-day packages, discount rules) ----
import Setting, { getSettings, DISCOUNT_TYPES } from '../models/Setting.js';
import { bookingAnalytics } from '../services/statsService.js';
export const getPlatformSettings = asyncHandler(async (_req, res) => res.json({ settings: await getSettings() }));

const percent = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw ApiError.badRequest(`${name} must be a percentage between 0 and 100`);
  return Math.round(n * 100) / 100;
};
const bool = (v) => v === true || v === 'true';

/** Validates the discount rules sent by the admin screen; anything not sent keeps its current value. */
function cleanDiscounts(body, current) {
  const d = JSON.parse(JSON.stringify(current));
  if (body.enabled !== undefined) d.enabled = bool(body.enabled);
  if (body.fullDay) {
    if (body.fullDay.enabled !== undefined) d.fullDay.enabled = bool(body.fullDay.enabled);
    if (body.fullDay.percent !== undefined) d.fullDay.percent = percent(body.fullDay.percent, 'Full-day discount');
  }
  if (body.multiEvent) {
    if (body.multiEvent.enabled !== undefined) d.multiEvent.enabled = bool(body.multiEvent.enabled);
    if (body.multiEvent.tiers !== undefined) {
      if (!Array.isArray(body.multiEvent.tiers) || body.multiEvent.tiers.length > 6) throw ApiError.badRequest('Add up to 6 multi-event tiers');
      const tiers = body.multiEvent.tiers.map((t) => ({ minEvents: parseInt(t.minEvents), percent: percent(t.percent, 'Multi-event discount') }));
      if (tiers.some((t) => !(t.minEvents >= 2 && t.minEvents <= 20))) throw ApiError.badRequest('A multi-event tier starts at 2 to 20 events');
      if (new Set(tiers.map((t) => t.minEvents)).size !== tiers.length) throw ApiError.badRequest('Each multi-event tier needs a different number of events');
      d.multiEvent.tiers = tiers.sort((a, b) => a.minEvents - b.minEvents);
    }
  }
  if (body.multiDay) {
    if (body.multiDay.enabled !== undefined) d.multiDay.enabled = bool(body.multiDay.enabled);
    if (body.multiDay.percent !== undefined) d.multiDay.percent = percent(body.multiDay.percent, 'Multi-day discount');
    if (body.multiDay.minDays !== undefined) { const n = parseInt(body.multiDay.minDays); if (!(n >= 2 && n <= 10)) throw ApiError.badRequest('Multi-day discount starts at 2 to 10 days'); d.multiDay.minDays = n; }
  }
  if (body.repeat) {
    if (body.repeat.enabled !== undefined) d.repeat.enabled = bool(body.repeat.enabled);
    if (body.repeat.percent !== undefined) d.repeat.percent = percent(body.repeat.percent, 'Repeat-booking discount');
    if (body.repeat.minPriorBookings !== undefined) { const n = parseInt(body.repeat.minPriorBookings); if (!(n >= 1 && n <= 20)) throw ApiError.badRequest('Repeat discount needs 1 to 20 earlier bookings'); d.repeat.minPriorBookings = n; }
  }
  if (body.stacking !== undefined) { if (!['stack', 'best'].includes(body.stacking)) throw ApiError.badRequest('Stacking must be stack or best'); d.stacking = body.stacking; }
  if (body.priority !== undefined) {
    if (!Array.isArray(body.priority) || body.priority.length !== DISCOUNT_TYPES.length || DISCOUNT_TYPES.some((t) => !body.priority.includes(t))) throw ApiError.badRequest(`Priority must list each of: ${DISCOUNT_TYPES.join(', ')}`);
    d.priority = [...body.priority];
  }
  if (body.maxPercent !== undefined) d.maxPercent = percent(body.maxPercent, 'Maximum combined discount');
  return d;
}

export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const body = {};
  if (req.body.bookingApproval !== undefined) {
    if (!['manual', 'auto_verified'].includes(req.body.bookingApproval)) throw ApiError.badRequest('Choose manual or auto_verified');
    body.bookingApproval = req.body.bookingApproval;
  }
  if (req.body.reviewHours !== undefined) body.reviewHours = Math.min(168, Math.max(1, parseInt(req.body.reviewHours) || 24));
  if (req.body.fullDayPackages !== undefined) body.fullDayPackages = bool(req.body.fullDayPackages);
  if (req.body.eventSlotHours !== undefined) {
    const h = Number(req.body.eventSlotHours);
    if (!(h >= 1 && h <= 24)) throw ApiError.badRequest('An event slot is 1 to 24 hours');
    body.eventSlotHours = h;
  }
  if (req.body.discounts !== undefined) {
    if (typeof req.body.discounts !== 'object' || Array.isArray(req.body.discounts)) throw ApiError.badRequest('discounts must be an object');
    body.discounts = cleanDiscounts(req.body.discounts, (await getSettings()).discounts);
    body.discountsUpdatedAt = new Date();
  }
  await Setting.findOneAndUpdate({ key: 'platform' }, { $set: body }, { new: true, upsert: true, setDefaultsOnInsert: true });
  // Confirmed bookings keep their own pricing snapshot, so new rules only apply to new quotes.
  res.json({ settings: await getSettings() });
});

export const bookingStats = asyncHandler(async (_req, res) => res.json(await bookingAnalytics()));
