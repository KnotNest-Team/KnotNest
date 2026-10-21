import mongoose from 'mongoose';

const { Schema } = mongoose;

const vendorSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  ownerName: { type: String, trim: true, default: '' },
  email: { type: String, lowercase: true, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  description: { type: String, default: '', maxlength: 3000 },
  location: { type: String, trim: true, default: '' },          // locality, e.g. "Bandra West"
  city: { type: String, trim: true, default: '', index: true },
  state: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  startingPrice: { type: Number, default: 0, min: 0, index: true },
  images: [String],                                              // portfolio; images[0] is the cover
  logo: { type: String, default: '' },
  services: [{ name: { type: String, required: true }, description: String, price: Number }],
  packages: [{ name: { type: String, required: true }, price: { type: Number, required: true }, description: String, features: [String] }],
  unavailableDates: [String],                                    // 'YYYY-MM-DD' whole days (blocked by vendor, or held by a full-day booking)
  // ---- flexible wedding bookings ----
  // Price for one wedding event (matched by name, e.g. "Haldi"). Events without a row use startingPrice.
  eventPricing: [{ _id: false, eventName: { type: String, required: true, trim: true, maxlength: 60 }, price: { type: Number, required: true, min: 0 } }],
  // Which events the vendor covers (names or keywords, e.g. "Sangeet", "Reception"). Empty = every event.
  eventsOffered: [{ type: String, trim: true, maxlength: 60 }],
  // Full-day package: book every event on one wedding day together. price 0 = sum of event prices less the platform full-day discount.
  fullDay: {
    enabled: { type: Boolean, default: true },
    price: { type: Number, default: 0, min: 0 },
  },
  // Time slots held by accepted / confirmed event bookings (minutes after midnight, end exclusive)
  bookedSlots: [{ _id: false, date: String, start: Number, end: Number, booking: { type: Schema.Types.ObjectId, ref: 'Booking' } }],
  slotVersion: { type: Number, default: 0 },                     // optimistic lock for calendar holds
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  socialLinks: { website: String, instagram: String, facebook: String, youtube: String },
  views: { type: Number, default: 0 },
  viewsLog: [{ _id: false, date: String, count: Number }],
}, { timestamps: true });

vendorSchema.index({ businessName: 'text', description: 'text', city: 'text', location: 'text' });
export default mongoose.model('Vendor', vendorSchema);
