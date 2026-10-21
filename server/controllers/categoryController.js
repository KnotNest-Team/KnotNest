import Category from '../models/Category.js';
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';

export const list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user?.role === 'admin';
  const categories = await Category.find(all ? {} : { status: 'active' }).sort('name').lean();
  const vs = await Vendor.find({ status: 'approved' }).select('category').lean();
  const count = (id) => vs.filter((v) => String(v.category) === String(id)).length;
  res.json({ categories: categories.map((c) => ({ ...c, vendorCount: count(c._id) })) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ category: await Category.create(pick(req.body, ['name', 'description', 'image', 'status'])) });
});

export const update = asyncHandler(async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) throw ApiError.notFound('Category not found');
  Object.assign(c, pick(req.body, ['name', 'description', 'image', 'status']));
  await c.save();
  res.json({ category: c });
});

export const remove = asyncHandler(async (req, res) => {
  if (await Vendor.exists({ category: req.params.id })) throw ApiError.conflict('Category has vendors. Deactivate it instead of deleting.');
  const c = await Category.findByIdAndDelete(req.params.id);
  if (!c) throw ApiError.notFound('Category not found');
  res.json({ message: 'Category deleted' });
});
