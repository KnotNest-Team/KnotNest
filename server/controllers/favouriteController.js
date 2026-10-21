import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'favourites', match: { status: 'approved' }, populate: { path: 'category', select: 'name' }, select: '-viewsLog' });
  res.json({ favourites: user.favourites });
});

/** Toggle: adds when absent, removes when present. */
export const toggle = asyncHandler(async (req, res) => {
  if (!(await Vendor.exists({ _id: req.params.vendorId }))) throw ApiError.notFound('Vendor not found');
  const user = await User.findById(req.user._id);
  const has = user.favourites.some((id) => String(id) === req.params.vendorId);
  if (has) user.favourites.pull(req.params.vendorId); else user.favourites.push(req.params.vendorId);
  await user.save();
  res.json({ favourited: !has, ids: user.favourites });
});
