import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { pick } from '../utils/validate.js';
import { notifyAdmins } from '../services/notificationService.js';

const payload = async (user) => {
  const out = user.toJSON();
  if (user.role === 'vendor') {
    const v = await Vendor.findOne({ owner: user._id }).select('_id status businessName');
    out.vendor = v ? { _id: v._id, status: v.status, businessName: v.businessName } : null;
  }
  return out;
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'customer', businessName, category, city } = req.body;
  if (!['customer', 'vendor'].includes(role)) throw ApiError.badRequest('Role must be customer or vendor');
  if (await User.findOne({ email: email.toLowerCase() })) throw ApiError.conflict('An account with this email already exists');
  if (role === 'vendor' && (!businessName || !category)) throw ApiError.badRequest('Business name and category are required for vendors');

  const user = await User.create({ name, email, phone, password, role });
  if (role === 'vendor') {
    const cat = await Category.findById(category);
    if (!cat) { await user.deleteOne(); throw ApiError.badRequest('Invalid category'); }
    await Vendor.create({ owner: user._id, businessName, ownerName: name, email: user.email, phone, category: cat._id, city: city || '', status: 'pending' });
    await notifyAdmins('New vendor registration', `${businessName} is waiting for approval.`, 'vendor', '/admin/approvals');
  }
  res.status(201).json({ token: signToken(user._id), user: await payload(user) });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Your account has been suspended. Contact support.');
  res.json({ token: signToken(user._id), user: await payload(user) });
});

export const me = asyncHandler(async (req, res) => res.json({ user: await payload(req.user) }));

export const logout = (_req, res) => res.json({ message: 'Logged out' }); // JWT is stateless; the client discards the token

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, pick(req.body, ['name', 'phone', 'profileImage']));
  await req.user.save();
  res.json({ user: await payload(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
