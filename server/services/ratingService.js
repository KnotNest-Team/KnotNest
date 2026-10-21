import Review from '../models/Review.js';
import Vendor from '../models/Vendor.js';

/** Recalculates a vendor's average rating and review count from published reviews. */
export async function recalcVendorRating(vendorId) {
  const rows = await Review.find({ vendor: vendorId, status: 'published' }).select('rating').lean();
  const count = rows.length;
  const avg = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
  await Vendor.findByIdAndUpdate(vendorId, { rating: Math.round(avg * 10) / 10, reviewCount: count });
}
