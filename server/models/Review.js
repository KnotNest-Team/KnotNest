import mongoose from 'mongoose';

const { Schema } = mongoose;
const reviewSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 2000 },
  images: [String],
  reply: { type: String, default: '' },
  reported: { type: Boolean, default: false },
  status: { type: String, enum: ['published', 'hidden'], default: 'published' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Review', reviewSchema);
