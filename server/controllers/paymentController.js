/**
 * Booking advance payments with Razorpay (test mode).
 * Flow: vendor confirms -> customer creates an order -> Razorpay Checkout in the browser -> server verifies the
 * HMAC signature -> booking.advancePaid. Without Razorpay keys (development only) a clearly labelled
 * "simulated payment" is used so the whole flow can still be demonstrated.
 */
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isProd } from '../config/env.js';
import { notify } from '../services/notificationService.js';

const keys = () => ({ id: process.env.RAZORPAY_KEY_ID || '', secret: process.env.RAZORPAY_KEY_SECRET || '' });
const percent = (name, def) => Math.min(100, Math.max(0, Number(process.env[name]) || def));
export const advancePercent = () => percent('ADVANCE_PERCENT', 10);
export const commissionPercent = () => percent('COMMISSION_PERCENT', 8);
const mode = () => (keys().id && keys().secret ? 'razorpay' : isProd ? 'off' : 'demo');

async function payableBooking(req, id) {
  const booking = await Booking.findById(id).populate('vendor', 'businessName owner');
  if (!booking) throw ApiError.notFound('Booking not found');
  if (String(booking.customer) !== String(req.user._id)) throw ApiError.forbidden();
  if (booking.status !== 'confirmed') throw ApiError.badRequest('You can pay the advance once the vendor confirms the booking');
  if (booking.advancePaid) throw ApiError.conflict('The advance for this booking is already paid');
  if (!booking.amount) throw ApiError.badRequest('This booking has no amount yet. Ask the vendor to set the price.');
  return booking;
}

export const config = asyncHandler(async (_req, res) => res.json({ mode: mode(), keyId: keys().id, advancePercent: advancePercent() }));

/** Creates a Razorpay order (or a demo order) for the booking advance. */
export const createOrder = asyncHandler(async (req, res) => {
  const booking = await payableBooking(req, req.body.booking);
  const amount = Math.max(1, Math.round((booking.amount * advancePercent()) / 100));
  const m = mode();
  if (m === 'off') throw new ApiError(503, 'Online payments are not set up yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  let orderId = `demo_${crypto.randomBytes(8).toString('hex')}`;
  if (m === 'razorpay') {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keys().id}:${keys().secret}`).toString('base64')}` },
      body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: `bk_${booking._id}`, notes: { booking: String(booking._id) } }),
    }).catch((e) => { throw new ApiError(502, `Could not reach Razorpay: ${e.message}`); });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(502, data?.error?.description || 'Razorpay rejected the order');
    orderId = data.id;
  }
  await Payment.create({ booking: booking._id, customer: req.user._id, vendor: booking.vendor._id, amount, provider: m, orderId });
  res.status(201).json({
    mode: m, keyId: keys().id, orderId, amount, amountPaise: amount * 100, currency: 'INR',
    name: 'KnotNest', description: `Advance for ${booking.vendor.businessName}`,
    prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || '' },
  });
});

/** Verifies the payment. Razorpay: HMAC_SHA256(order_id|payment_id, secret) must equal the signature. */
export const verify = asyncHandler(async (req, res) => {
  const { orderId, paymentId = '', signature = '' } = req.body;
  const payment = await Payment.findOne({ orderId, customer: req.user._id });
  if (!payment) throw ApiError.notFound('Payment order not found');
  if (payment.status === 'paid') throw ApiError.conflict('This payment is already recorded');
  if (payment.provider === 'razorpay') {
    const expected = crypto.createHmac('sha256', keys().secret).update(`${orderId}|${paymentId}`).digest('hex');
    const ok = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) { payment.status = 'failed'; await payment.save(); throw ApiError.badRequest('Payment could not be verified. No advance was recorded.'); }
  } else if (isProd) throw ApiError.badRequest('Simulated payments are disabled in production');

  const booking = await payableBooking(req, payment.booking);
  payment.status = 'paid'; payment.paymentId = paymentId || `demo_pay_${Date.now()}`; payment.paidAt = new Date();
  payment.commission = Math.round((booking.amount * commissionPercent()) / 100);
  await payment.save();
  booking.advanceAmount = payment.amount; booking.advancePaid = true; booking.advancePaidAt = payment.paidAt;
  await booking.save();
  await notify(booking.vendor.owner, 'Advance received', `${req.user.name} paid the ₹${payment.amount.toLocaleString('en-IN')} advance. The date is locked in.`, 'payment', '/vendor/bookings');
  await notify(req.user._id, 'Advance paid', `Your date with ${booking.vendor.businessName} is locked in.`, 'payment', '/customer/bookings');
  res.json({ booking, payment });
});
