import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import { escapeRegex, pageParams } from '../utils/validate.js';

const isId = (s) => /^[a-f\d]{24}$/i.test(s);

async function resolveCategory(term) {
  if (isId(term)) return [term];
  const stem = escapeRegex(term.slice(0, Math.max(4, term.length - 2)));
  const cats = await Category.find({ $or: [{ slug: term.toLowerCase() }, { name: new RegExp(`^${stem}`, 'i') }] }).select('_id');
  return cats.map((c) => c._id);
}

/** Builds and runs the marketplace query. Public results are always status=approved. */
export async function searchVendors(q, { includeAll = false } = {}) {
  const filter = {};
  if (!includeAll) filter.status = 'approved';
  else if (q.status) filter.status = q.status;

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    const cats = await Category.find({ name: rx }).select('_id');
    filter.$or = [
      { businessName: rx }, { description: rx }, { city: rx }, { location: rx },
      { 'services.name': rx }, ...(cats.length ? [{ category: { $in: cats.map((c) => c._id) } }] : []),
    ];
  }
  if (q.category) filter.category = { $in: await resolveCategory(String(q.category)) };
  if (q.city) filter.city = new RegExp(`^${escapeRegex(q.city)}$`, 'i');
  if (q.minPrice || q.maxPrice) {
    filter.startingPrice = {};
    if (q.minPrice) filter.startingPrice.$gte = Number(q.minPrice);
    if (q.maxPrice) filter.startingPrice.$lte = Number(q.maxPrice);
  }
  if (q.rating) filter.rating = { $gte: Number(q.rating) };
  if (q.verified === 'true') filter.verified = true;
  if (q.featured === 'true') filter.featured = true;
  if (q.available) filter.unavailableDates = { $ne: String(q.available).slice(0, 10) };

  const sorts = {
    popular: { featured: -1, reviewCount: -1, views: -1 },
    rating: { rating: -1, reviewCount: -1 },
    price_asc: { startingPrice: 1 },
    price_desc: { startingPrice: -1 },
    newest: { createdAt: -1 },
  };
  const sort = sorts[q.sort] || sorts.popular;
  const { page, limit, skip } = pageParams(q, 9);

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).populate('category', 'name slug').sort(sort).skip(skip).limit(limit).select('-viewsLog -bookedSlots -slotVersion').lean(),
    Vendor.countDocuments(filter),
  ]);
  return { vendors, total, page, pages: Math.ceil(total / limit) || 1 };
}

export async function trackView(vendorId) {
  const today = new Date().toISOString().slice(0, 10);
  await Vendor.updateOne({ _id: vendorId }, { $inc: { views: 1 } });
  const r = await Vendor.updateOne({ _id: vendorId, 'viewsLog.date': today }, { $inc: { 'viewsLog.$.count': 1 } });
  if (!r.modifiedCount) await Vendor.updateOne({ _id: vendorId }, { $push: { viewsLog: { date: today, count: 1 } } });
}
