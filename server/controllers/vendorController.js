import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';
import { searchVendors, trackView } from '../services/vendorService.js';
import { vendorAnalytics } from '../services/statsService.js';
import { notify } from '../services/notificationService.js';

const OWNER_FIELDS = ['businessName', 'ownerName', 'email', 'phone', 'category', 'description', 'location', 'city', 'state', 'address',
  'startingPrice', 'images', 'logo', 'services', 'packages', 'unavailableDates', 'socialLinks', 'eventPricing', 'eventsOffered', 'fullDay'];
const ADMIN_FIELDS = [...OWNER_FIELDS, 'verified', 'featured', 'status', 'owner'];

/** Event prices, covered events and the full-day package, cleaned before saving. */
function cleanPricing(data) {
  if (data.eventPricing !== undefined) {
    if (!Array.isArray(data.eventPricing)) throw ApiError.badRequest('eventPricing must be a list');
    const seen = new Set();
    data.eventPricing = data.eventPricing.map((x) => ({ eventName: String(x?.eventName || '').trim().slice(0, 60), price: Math.round(Number(x?.price)) }))
      .filter((x) => x.eventName && Number.isFinite(x.price) && x.price >= 0 && !seen.has(x.eventName.toLowerCase()) && seen.add(x.eventName.toLowerCase()));
  }
  if (data.eventsOffered !== undefined) data.eventsOffered = (Array.isArray(data.eventsOffered) ? data.eventsOffered : []).map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 40);
  if (data.fullDay !== undefined) data.fullDay = { enabled: data.fullDay?.enabled !== false, price: Math.max(0, Math.round(Number(data.fullDay?.price) || 0)) };
  return data;
}

export const list = asyncHandler(async (req, res) => res.json(await searchVendors(req.query)));

export const compare = asyncHandler(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 4);
  const vendors = await Vendor.find({ _id: { $in: ids }, status: 'approved' }).populate('category', 'name').select('-viewsLog').lean();
  res.json({ vendors });
});

export const getOne = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id).populate('category', 'name slug').select('-viewsLog').lean();
  if (!vendor) throw ApiError.notFound('Vendor not found');
  const isOwner = req.user && String(vendor.owner) === String(req.user._id);
  const isAdmin = req.user?.role === 'admin';
  if (vendor.status !== 'approved' && !isOwner && !isAdmin) throw ApiError.notFound('Vendor not found');
  if (!isOwner && !isAdmin) trackView(vendor._id).catch(() => {});
  // the public calendar shows when the vendor is busy, never which booking holds the time
  if (!isOwner && !isAdmin) vendor.bookedSlots = (vendor.bookedSlots || []).map(({ date, start, end }) => ({ date, start, end }));
  delete vendor.slotVersion;
  const reviews = await Review.find({ vendor: vendor._id, status: 'published' }).populate('customer', 'name profileImage').sort('-createdAt').limit(20).lean();
  res.json({ vendor, reviews });
});

export const create = asyncHandler(async (req, res) => {
  const data = cleanPricing(pick(req.body, ADMIN_FIELDS));
  if (!(await Category.exists({ _id: data.category }))) throw ApiError.badRequest('Invalid category');
  const vendor = await Vendor.create({ status: 'approved', ...data });
  res.status(201).json({ vendor });
});

export const update = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(vendor.owner) !== String(req.user._id)) throw ApiError.forbidden();
  const data = cleanPricing(pick(req.body, isAdmin ? ADMIN_FIELDS : OWNER_FIELDS));
  if (data.category && !(await Category.exists({ _id: data.category }))) throw ApiError.badRequest('Invalid category');
  Object.assign(vendor, data);
  await vendor.save();
  res.json({ vendor });
});

export const remove = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  res.json({ message: 'Vendor deleted' });
});

export const myProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user._id }).populate('category', 'name slug').select('-viewsLog');
  if (!vendor) throw ApiError.notFound('No vendor profile found for this account');
  res.json({ vendor });
});

export const myAnalytics = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ owner: req.user._id });
  if (!vendor) throw ApiError.notFound('No vendor profile found');
  res.json(await vendorAnalytics(vendor));
});

/** Admin moderation: approve | reject | suspend | verify | unverify | feature | unfeature */
export const moderate = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw ApiError.notFound('Vendor not found');
  const map = {
    approve: { status: 'approved' }, reject: { status: 'rejected' }, suspend: { status: 'suspended' },
    verify: { verified: true }, unverify: { verified: false }, feature: { featured: true }, unfeature: { featured: false },
  };
  const change = map[req.body.action];
  if (!change) throw ApiError.badRequest('Unknown action');
  Object.assign(vendor, change);
  await vendor.save();
  const msgs = {
    approve: 'Your vendor profile is approved and now live on KnotNest.',
    reject: 'Your vendor profile was not approved. Update your details and contact support.',
    suspend: 'Your vendor profile has been suspended.', verify: 'Your business is now a Verified vendor.',
  };
  if (msgs[req.body.action]) await notify(vendor.owner, 'Profile update', msgs[req.body.action], 'vendor', '/vendor/dashboard');
  res.json({ vendor });
});
