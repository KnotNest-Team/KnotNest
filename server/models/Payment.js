import mongoose from 'mongoose';

const { Schema } = mongoose;
/** One advance payment for a confirmed booking (Razorpay test mode, or simulated in development). */
const paymentSchema = new Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },              // rupees
  commission: { type: Number, default: 0, min: 0 },              // KnotNest's share of the booking value, rupees
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['razorpay', 'demo'], default: 'razorpay' },
  orderId: { type: String, index: true },
  paymentId: { type: String, default: '' },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
  paidAt: Date,
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
