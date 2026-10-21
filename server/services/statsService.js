import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';
import Category from '../models/Category.js';
import Payment from '../models/Payment.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Last `n` months (oldest first), zero-filled. Counts documents, or sums `sumField`.
 * Uses plain queries + bucketing so it behaves identically on MongoDB, Atlas and compatible servers.
 */
export async function monthly(Model, match = {}, { n = 6, sumField } = {}) {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0); start.setMonth(start.getMonth() - (n - 1));
  const rows = await Model.find({ ...match, createdAt: { $gte: start } }).select(`createdAt ${sumField || ''}`).lean();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start); d.setMonth(start.getMonth() + i);
    const value = rows
      .filter((r) => r.createdAt.getFullYear() === d.getFullYear() && r.createdAt.getMonth() === d.getMonth())
      .reduce((s, r) => s + (sumField ? r[sumField] || 0 : 1), 0);
    out.push({ month: MONTHS[d.getMonth()], value });
  }
  return out;
}

const zip = (obj) => {
  const keys = Object.keys(obj);
  return obj[keys[0]].map((p, i) => ({ month: p.month, ...Object.fromEntries(keys.map((k) => [k, obj[k][i].value])) }));
};
const tally = (items, keyFn, init) => {
  const m = new Map();
  items.forEach((it) => { const k = keyFn(it); if (!k) return; m.set(k, init(m.get(k), it)); });
  return [...m.entries()].map(([name, v]) => ({ name, ...v }));
};
const countBy = (docs, field) => tally(docs, (d) => d[field], (p) => ({ count: (p?.count || 0) + 1 }));

export async function adminDashboard() {
  const [totalUsers, totalVendors, pendingVendors, approvedVendors, totalBookings, totalEnquiries,
    userGrowth, vendorGrowth, bookings, enquiries, approved, cats] = await Promise.all([
    User.countDocuments(), Vendor.countDocuments(), Vendor.countDocuments({ status: 'pending' }),
    Vendor.countDocuments({ status: 'approved' }), Booking.countDocuments(), Enquiry.countDocuments(),
    monthly(User), monthly(Vendor), monthly(Booking), monthly(Enquiry),
    Vendor.find({ status: 'approved' }).select('category city views').lean(), Category.find().select('name').lean(),
  ]);
  const catName = Object.fromEntries(cats.map((c) => [String(c._id), c.name]));
  const group = (keyFn) => tally(approved, keyFn, (p, v) => ({ vendors: (p?.vendors || 0) + 1, views: (p?.views || 0) + (v.views || 0) }));
  return {
    totals: { totalUsers, totalVendors, pendingVendors, approvedVendors, totalBookings, totalEnquiries },
    growth: zip({ users: userGrowth, vendors: vendorGrowth, bookings, enquiries }),
    popularCategories: group((v) => catName[String(v.category)]).sort((a, b) => b.views - a.views).slice(0, 8),
    popularLocations: group((v) => v.city).sort((a, b) => b.vendors - a.vendors).slice(0, 8),
  };
}

export async function adminReports() {
  const [paid, topVendors, allBookings, allEnquiries, cats, payments, paymentTrend] = await Promise.all([
    Booking.find({ status: { $in: ['confirmed', 'completed'] } }).populate('vendor', 'category').select('amount vendor').lean(),
    Vendor.find({ status: 'approved' }).sort({ rating: -1, reviewCount: -1 }).limit(5).select('businessName city rating reviewCount views').lean(),
    Booking.find().select('status').lean(), Enquiry.find().select('status').lean(), Category.find().select('name').lean(),
    Payment.find({ status: 'paid' }).select('amount commission provider').lean(),
    monthly(Payment, { status: 'paid' }, { sumField: 'commission' }),
  ]);
  const earnings = {
    advances: payments.reduce((s, p) => s + p.amount, 0), commission: payments.reduce((s, p) => s + (p.commission || 0), 0),
    payments: payments.length, simulated: payments.filter((p) => p.provider === 'demo').length, trend: paymentTrend,
  };
  const catName = Object.fromEntries(cats.map((c) => [String(c._id), c.name]));
  const revenueByCategory = tally(paid, (b) => catName[String(b.vendor?.category)], (p, b) => ({ revenue: (p?.revenue || 0) + b.amount, bookings: (p?.bookings || 0) + 1 }))
    .sort((a, b) => b.revenue - a.revenue);
  return { revenueByCategory, topVendors, bookingStatus: countBy(allBookings, 'status'), enquiryStatus: countBy(allEnquiries, 'status'), earnings };
}

export async function vendorAnalytics(vendor) {
  const id = vendor._id;
  const [enq, bk, rev, enquiries, bookings, pendingEnquiries, paid] = await Promise.all([
    monthly(Enquiry, { vendor: id }), monthly(Booking, { vendor: id }),
    monthly(Booking, { vendor: id, status: { $in: ['confirmed', 'completed'] } }, { sumField: 'amount' }),
    Enquiry.countDocuments({ vendor: id }), Booking.countDocuments({ vendor: id }),
    Enquiry.countDocuments({ vendor: id, status: 'pending' }),
    Booking.find({ vendor: id, status: { $in: ['confirmed', 'completed'] } }).select('amount').lean(),
  ]);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key.slice(5), views: vendor.viewsLog?.find((l) => l.date === key)?.count || 0 });
  }
  return {
    totals: { views: vendor.views, enquiries, bookings, revenue: paid.reduce((s, b) => s + b.amount, 0), rating: vendor.rating, reviewCount: vendor.reviewCount, pendingEnquiries },
    monthly: zip({ enquiries: enq, bookings: bk, revenue: rev }),
    viewsByDay: days,
  };
}

/**
 * Flexible-booking analytics for the admin dashboard. "Granted" discounts and revenue count confirmed and
 * completed bookings only; open requests show what is currently on offer.
 */
export async function bookingAnalytics() {
  const all = await Booking.find().select('status bookingType amount pricing.totalDiscount pricing.subtotal pricing.discounts pricing.version days.mode days.date createdAt').lean();
  const DONE = ['confirmed', 'completed'];
  const OPENS = ['pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer'];
  const kind = (b) => {
    if (b.bookingType && b.bookingType !== 'legacy') return b.bookingType;
    return (b.days?.length || 0) > 1 ? 'multi_day' : 'legacy';
  };
  const hasFullDay = (b) => (b.days || []).some((d) => d.mode === 'full_day');
  const isMultiDay = (b) => new Set((b.days || []).map((d) => new Date(d.date).toISOString().slice(0, 10))).size > 1;
  const done = all.filter((b) => DONE.includes(b.status));
  const sum = (list, f) => list.reduce((t, b) => t + (f(b) || 0), 0);
  const byType = {};
  for (const b of all) byType[kind(b)] = (byType[kind(b)] || 0) + 1;
  const discountByType = {};
  for (const b of done) for (const d of b.pricing?.discounts || []) discountByType[d.type] = (discountByType[d.type] || 0) + (d.amount || 0);
  const [revenueTrend, discountTrend] = await Promise.all([
    monthly(Booking, { status: { $in: DONE } }, { sumField: 'amount' }),
    (async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0); start.setMonth(start.getMonth() - 5);
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(start); d.setMonth(start.getMonth() + i);
        const value = done.filter((b) => b.createdAt.getFullYear() === d.getFullYear() && b.createdAt.getMonth() === d.getMonth()).reduce((t, b) => t + (b.pricing?.totalDiscount || 0), 0);
        return { month: MONTHS[d.getMonth()], value };
      });
    })(),
  ]);
  return {
    totals: {
      bookings: all.length,
      fullDay: all.filter(hasFullDay).length,
      individualEvents: all.filter((b) => ['single_event', 'multi_event'].includes(kind(b)) || (b.days || []).some((d) => d.mode === 'events')).length,
      multiDay: all.filter(isMultiDay).length,
      olderFormat: all.filter((b) => !(b.pricing?.version >= 2)).length,
      discountsGranted: sum(done, (b) => b.pricing?.totalDiscount),
      discountsOffered: sum(all.filter((b) => OPENS.includes(b.status)), (b) => b.pricing?.totalDiscount),
      revenue: sum(done, (b) => b.amount),
      listValue: sum(done, (b) => (b.pricing?.version >= 2 ? b.pricing.subtotal : b.amount)),
    },
    byType: Object.entries(byType).map(([name, count]) => ({ name, count })),
    discountByType: Object.entries(discountByType).map(([name, amount]) => ({ name, amount })),
    status: countBy(all, 'status'),
    trend: revenueTrend.map((r, i) => ({ month: r.month, revenue: r.value, discounts: discountTrend[i].value })),
  };
}
