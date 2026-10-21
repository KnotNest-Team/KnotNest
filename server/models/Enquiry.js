import mongoose from 'mongoose';

const { Schema } = mongoose;
const enquirySchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  weddingDate: Date,
  eventType: { type: String, default: 'Wedding' },
  guestCount: { type: Number, default: 0 },
  message: { type: String, required: true, maxlength: 2000 },
  response: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'contacted', 'accepted', 'rejected', 'converted'], default: 'pending', index: true },
  // Message text is private between couple and vendor. Admins can read it only after one side reports it.
  report: {
    status: { type: String, enum: ['none', 'open', 'resolved'], default: 'none' },
    reason: { type: String, default: '' },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: Date,
    resolution: { type: String, default: '' },
  },
}, { timestamps: { createdAt: true, updatedAt: true } });

export default mongoose.model('Enquiry', enquirySchema);
