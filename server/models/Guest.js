import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;
export const FOOD = ['', 'Veg', 'Jain', 'Non-veg', 'Vegan'];

const guestSchema = new Schema({
  wedding: { type: Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },          // "Ramesh Uncle & family"
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '', maxlength: 20 },
  side: { type: String, enum: ['bride', 'groom', 'both'], default: 'both' },
  maxGuests: { type: Number, default: 2, min: 1, max: 20 },                    // how many people this invitation covers
  seat: { type: String, trim: true, default: '', maxlength: 40 },              // optional table / seat
  events: [{
    _id: false,
    event: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['pending', 'attending', 'declined'], default: 'pending' },
    headcount: { type: Number, default: 0, min: 0, max: 20 },
  }],
  foodPreference: { type: String, enum: FOOD, default: '' },
  guestNote: { type: String, trim: true, default: '', maxlength: 500 },       // message from the guest to the couple
  respondedAt: Date,
  // Unguessable link key: /rsvp/<token>. Opening the invite needs no account.
  token: { type: String, unique: true, index: true, default: () => crypto.randomBytes(18).toString('base64url') },
  invite: {
    status: { type: String, enum: ['not_sent', 'queued', 'sent', 'failed'], default: 'not_sent' },
    sentAt: Date,
    error: { type: String, default: '' },
    previewUrl: { type: String, default: '' },                                 // Ethereal / outbox preview in development
    count: { type: Number, default: 0 },
  },
}, { timestamps: true });

guestSchema.index({ wedding: 1, email: 1 });
export default mongoose.model('Guest', guestSchema);
