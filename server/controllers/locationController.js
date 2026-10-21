import Location from '../models/Location.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';

export const list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user?.role === 'admin';
  res.json({ locations: await Location.find(all ? {} : { status: 'active' }).sort('city').lean() });
});
export const create = asyncHandler(async (req, res) =>
  res.status(201).json({ location: await Location.create(pick(req.body, ['city', 'state', 'image', 'status'])) }));
export const update = asyncHandler(async (req, res) => {
  const l = await Location.findByIdAndUpdate(req.params.id, pick(req.body, ['city', 'state', 'image', 'status']), { new: true, runValidators: true });
  if (!l) throw ApiError.notFound('Location not found');
  res.json({ location: l });
});
export const remove = asyncHandler(async (req, res) => {
  if (!(await Location.findByIdAndDelete(req.params.id))) throw ApiError.notFound('Location not found');
  res.json({ message: 'Location deleted' });
});
