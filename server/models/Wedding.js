import mongoose from 'mongoose';

const { Schema } = mongoose;
export const DEFAULT_TASKS = [
  'Book Venue', 'Book Photographer', 'Book Decorator', 'Book Makeup Artist', 'Finalize Catering',
  'Buy Wedding Outfits', 'Book Jewellery', 'Send Invitations', 'Book Transportation', 'Final Vendor Confirmation',
];
export const EVENT_NAMES = ['Roka', 'Engagement', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception', 'Cocktail', 'Puja'];

/** One function of the wedding. Venue details are typed in, or filled from a confirmed venue booking. */
const eventSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  date: { type: Date, required: true },
  time: { type: String, trim: true, default: '', maxlength: 40 },            // e.g. "7:00 PM onwards"
  venueName: { type: String, trim: true, default: '', maxlength: 120 },
  address: { type: String, trim: true, default: '', maxlength: 300 },
  mapLink: { type: String, trim: true, default: '', maxlength: 500 },
  dressCode: { type: String, trim: true, default: '', maxlength: 120 },
  notes: { type: String, trim: true, default: '', maxlength: 500 },
  meaning: { type: String, trim: true, default: '', maxlength: 400 },              // what happens, shown to guests
  hostSide: { type: String, enum: ['bride', 'groom', 'both'], default: 'both' },
  tradition: { type: String, trim: true, default: '' },                             // e.g. "Gujarati" in two-culture weddings
  templateKey: { type: String, default: '' },                                       // which suggestion it came from (empty = added by the couple)
  venueBooking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null }, // live venue source
});

const weddingSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  partnerName: { type: String, trim: true, default: '' },
  weddingDate: Date,
  location: { type: String, trim: true, default: '' },
  guestCount: { type: Number, default: 0, min: 0 },
  budget: { type: Number, default: 0, min: 0 },
  weddingStyle: { type: String, trim: true, default: '' },
  // Traditions drive automatic event planning (keys from data/weddingTraditions.js)
  culture: { type: String, trim: true, default: '' },
  partnerCulture: { type: String, trim: true, default: '' },     // second tradition for two-culture weddings
  muhurat: { type: String, trim: true, default: '' },
  // Invitation design ('' = chosen automatically from the tradition)
  inviteTheme: { type: String, enum: ['', 'royal', 'gujarati', 'marathi', 'punjabi', 'south', 'bengali', 'nikah', 'christian', 'modern'], default: '' },            // "HH:MM", main ceremony time chosen by the family priest
  // How the couple appears on invitations, e.g. "Priya & Aarav" (defaults to "<first name> & <partner>")
  coupleNames: { type: String, trim: true, default: '', maxlength: 80 },
  // Shown on invitations, e.g. "With the blessings of the Sharma and Patel families"
  inviteMessage: { type: String, trim: true, default: '', maxlength: 600 },
  checklist: [{
    title: { type: String, required: true, trim: true },
    dueDate: Date,
    done: { type: Boolean, default: false },
  }],
  events: [eventSchema],
}, { timestamps: true });

export default mongoose.model('Wedding', weddingSchema);
