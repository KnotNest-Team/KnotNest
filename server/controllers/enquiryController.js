import Enquiry from '../models/Enquiry.js';
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageParams, pick } from '../utils/validate.js';
import { notify, notifyAdmins } from '../services/notificationService.js';

export const create = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.body.vendor, status: 'approved' });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  const enquiry = await Enquiry.create({
    ...pick(req.body, ['name', 'email', 'phone', 'weddingDate', 'eventType', 'guestCount', 'message']),
    customer: req.user._id, vendor: vendor._id,
  });
  await notify(vendor.owner, 'New enquiry', `${enquiry.name} sent an enquiry for ${enquiry.eventType}.`, 'enquiry', '/vendor/enquiries');
  await notify(req.user._id, 'Enquiry submitted', `Your enquiry to ${vendor.businessName} was sent.`, 'enquiry', '/customer/enquiries');
  res.status(201).json({ enquiry });
});

export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  if (req.user.role === 'vendor') {
    const v = await Vendor.findOne({ owner: req.user._id }).select('_id');
    filter.vendor = v?._id;
  }
  if (req.query.status) filter.status = req.query.status;
  const { page, limit, skip } = pageParams(req.query, 20);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).populate('vendor', 'businessName images logo city').populate('customer', 'name email').sort('-createdAt').skip(skip).limit(limit).lean(),
    Enquiry.countDocuments(filter),
  ]);
  res.json({ enquiries, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const update = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).populate('vendor', 'owner businessName');
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(enquiry.vendor.owner) !== String(req.user._id)) throw ApiError.forbidden();
  if (!['pending', 'contacted', 'accepted', 'rejected', 'converted'].includes(req.body.status)) throw ApiError.badRequest('Invalid status');
  enquiry.status = req.body.status;
  if (req.body.response !== undefined) enquiry.response = req.body.response;
  await enquiry.save();
  await notify(enquiry.customer, 'Vendor response', `${enquiry.vendor.businessName} marked your enquiry as ${enquiry.status}.`, 'enquiry', '/customer/enquiries');
  res.json({ enquiry });
});

/** Couple or vendor reports an enquiry thread (spam, abuse, scam). Unlocks admin review. */
export const report = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).populate('vendor', 'owner businessName');
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const mine = String(enquiry.customer) === String(req.user._id) || String(enquiry.vendor.owner) === String(req.user._id);
  if (!mine) throw ApiError.forbidden();
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) throw ApiError.badRequest('Tell us briefly what went wrong (at least 5 characters)');
  enquiry.report = { status: 'open', reason: reason.slice(0, 500), by: req.user._id, at: new Date(), resolution: '' };
  await enquiry.save();
  await notifyAdmins('Enquiry reported', `An enquiry for ${enquiry.vendor.businessName} was reported.`, 'report', '/admin/safety');
  res.json({ message: 'Reported. Our team will review it.' });
});
