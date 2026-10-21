import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageParams, pick } from '../utils/validate.js';
import { recalcVendorRating } from '../services/ratingService.js';
import { notify, notifyAdmins } from '../services/notificationService.js';

export const create = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.body.booking).populate('vendor', 'owner businessName');
  if (!booking || String(booking.customer) !== String(req.user._id)) throw ApiError.notFound('Booking not found');
  if (booking.status !== 'completed') throw ApiError.badRequest('You can only review vendors after a completed booking');
  if (await Review.exists({ booking: booking._id })) throw ApiError.conflict('You already reviewed this booking');
  const review = await Review.create({
    ...pick(req.body, ['rating', 'comment', 'images']), customer: req.user._id, vendor: booking.vendor._id, booking: booking._id,
  });
  await recalcVendorRating(booking.vendor._id);
  await notify(booking.vendor.owner, 'New review', `${req.user.name} left a ${review.rating}-star review.`, 'review', '/vendor/reviews');
  res.status(201).json({ review });
});

export const forVendor = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 10);
  const filter = { vendor: req.params.vendorId, status: 'published' };
  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('customer', 'name profileImage').sort('-createdAt').skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ reviews, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** Scoped list: customer = own, vendor = own business, admin = everything. */
export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  if (req.user.role === 'vendor') filter.vendor = (await Vendor.findOne({ owner: req.user._id }).select('_id'))?._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.reported === 'true') filter.reported = true;
  const { page, limit, skip } = pageParams(req.query, 20);
  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('customer', 'name').populate('vendor', 'businessName').sort('-createdAt').skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ reviews, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const moderate = asyncHandler(async (req, res) => {
  if (!['published', 'hidden'].includes(req.body.status)) throw ApiError.badRequest('Invalid status');
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status, reported: false }, { new: true });
  if (!review) throw ApiError.notFound('Review not found');
  await recalcVendorRating(review.vendor);
  res.json({ review });
});

export const remove = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await recalcVendorRating(review.vendor);
  res.json({ message: 'Review deleted' });
});

const ownReview = async (req) => {
  const review = await Review.findById(req.params.id).populate('vendor', 'owner businessName');
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.vendor.owner) !== String(req.user._id)) throw ApiError.forbidden();
  return review;
};

export const reply = asyncHandler(async (req, res) => {
  const review = await ownReview(req);
  review.reply = String(req.body.reply || '').slice(0, 1000);
  await review.save();
  res.json({ review });
});

export const report = asyncHandler(async (req, res) => {
  const review = await ownReview(req);
  review.reported = true;
  await review.save();
  await notifyAdmins('Review reported', `${review.vendor.businessName} reported a review for moderation.`, 'report', '/admin/reviews');
  res.json({ review });
});
