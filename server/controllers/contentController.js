import SiteContent from '../models/SiteContent.js';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import Location from '../models/Location.js';
import ContactMessage from '../models/ContactMessage.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';
import { notifyAdmins } from '../services/notificationService.js';

const SECTIONS = ['hero', 'trust', 'google', 'stories', 'testimonials', 'experiences', 'offers', 'banners', 'featuredVendors'];

export const home = asyncHandler(async (_req, res) => {
  const content = (await SiteContent.findOne({ key: 'home' }).lean()) || {};
  let featured = [];
  if (content.featuredVendors?.length) featured = await Vendor.find({ _id: { $in: content.featuredVendors }, status: 'approved' }).populate('category', 'name').select('-viewsLog').lean();
  if (!featured.length) featured = await Vendor.find({ status: 'approved', featured: true }).populate('category', 'name').limit(6).select('-viewsLog').lean();
  const [categories, locations] = await Promise.all([
    Category.find({ status: 'active' }).sort('name').lean(), Location.find({ status: 'active' }).sort('city').lean(),
  ]);
  res.json({ ...content, featuredVendors: featured, categories, locations });
});

export const adminGet = asyncHandler(async (_req, res) => res.json({ content: (await SiteContent.findOne({ key: 'home' }).lean()) || {} }));

export const adminUpdate = asyncHandler(async (req, res) => {
  const data = pick(req.body, SECTIONS);
  const content = await SiteContent.findOneAndUpdate({ key: 'home' }, { $set: data }, { new: true, upsert: true, runValidators: true });
  res.json({ content });
});

export const contact = asyncHandler(async (req, res) => {
  const msg = await ContactMessage.create(pick(req.body, ['name', 'email', 'subject', 'message']));
  await notifyAdmins('New contact message', `${msg.name}: ${msg.subject || msg.message.slice(0, 60)}`, 'system', '/admin/notifications');
  res.status(201).json({ message: 'Thanks! We will get back to you shortly.' });
});

export const contactMessages = asyncHandler(async (_req, res) => res.json({ messages: await ContactMessage.find().sort('-createdAt').limit(100).lean() }));
export const deleteContactMessage = asyncHandler(async (req, res) => {
  if (!(await ContactMessage.findByIdAndDelete(req.params.id))) throw ApiError.notFound('Message not found');
  res.json({ message: 'Deleted' });
});
