import mongoose from 'mongoose';

const { Schema } = mongoose;
const bookingSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  weddingDate: { type: Date, required: true },                 // first day (kept for sorting and older screens)
  // One booking can cover several days (e.g. a venue for sangeet, wedding and reception).
  // Each day has its own event, package and price; `amount` is the total.
  // A day can be a whole-date booking (older requests and dates without planned events), a full-day package
  // (every eligible event that day) or a selection of individual events.
  days: [{
    _id: false,
    date: { type: Date, required: true },
    event: { type: Schema.Types.ObjectId, default: null },       // first event of the day (older screens)
    eventName: { type: String, default: '' },
    packageName: { type: String, default: '' },
    amount: { type: Number, default: 0, min: 0 },                 // the day's price before booking-wide discounts
    mode: { type: String, enum: ['date', 'full_day', 'events'], default: 'date' },
    events: [{
      _id: false,
      event: { type: Schema.Types.ObjectId, default: null },     // Wedding.events._id
      name: { type: String, default: '' },
      time: { type: String, default: '' },
      start: { type: Number, default: null },                    // minutes after midnight (slot held on the vendor)
      end: { type: Number, default: null },
      price: { type: Number, default: 0, min: 0 },               // vendor price at the time of the request
      packageName: { type: String, default: '' },
    }],
    subtotal: { type: Number, default: 0, min: 0 },               // sum of the event prices
    packagePrice: { type: Number, default: null },                // vendor's own full-day package price, if any
  }],
  // The couple's wedding, and the checkout this booking was created in (several vendors can share one checkout)
  wedding: { type: Schema.Types.ObjectId, ref: 'Wedding', default: null, index: true },
  checkout: { type: String, default: '', index: true },
  bookingType: { type: String, enum: ['legacy', 'single_event', 'multi_event', 'full_day', 'multi_day'], default: 'legacy', index: true },
  /*
   * Pricing snapshot written by the server's pricing engine when the request is made. It keeps the vendor
   * prices and the discount rules in force at that moment, so later price or rule changes never alter it.
   * `amount` is always pricing.final (or the vendor/admin adjusted price, recorded in pricing.adjustments).
   */
  pricing: {
    version: { type: Number, default: 0 },                        // 0 = older booking without a breakdown
    subtotal: { type: Number, default: 0 },                       // every event at its individual price
    packageSavings: { type: Number, default: 0 },                 // vendor full-day package prices below the event total
    eligibleSubtotal: { type: Number, default: 0 },               // what percentage discounts are calculated on
    discounts: [{ _id: false, type: { type: String }, label: String, reason: String, percent: Number, amount: Number, day: String, trimmed: { type: Boolean, default: false } }],
    totalDiscount: { type: Number, default: 0 },
    capped: { type: Boolean, default: false },
    maxPercent: { type: Number, default: 0 },
    stacking: { type: String, default: '' },
    final: { type: Number, default: 0 },
    priorBookings: { type: Number, default: 0 },                  // confirmed/completed bookings counted for the repeat discount
    rules: { type: Schema.Types.Mixed, default: null },           // discount settings used
    quotedAt: Date,
    confirmedAt: Date,                                            // price locked when the couple confirmed
    adjustments: [{ _id: false, by: String, from: Number, to: Number, note: String, at: { type: Date, default: Date.now } }],
  },
  // Changes to the wedding plan after the request (event moved or removed) that the vendor and KnotNest should see
  alerts: [{ _id: false, type: { type: String }, message: String, at: { type: Date, default: Date.now }, resolved: { type: Boolean, default: false } }],
  eventType: { type: String, default: 'Wedding' },
  // Optional link to one function (haldi, sangeet, ...) inside the customer's Wedding.events
  event: { type: Schema.Types.ObjectId, default: null },
  packageName: { type: String, default: '' },
  // Always set by the server from the vendor's package / starting price (vendor or admin may adjust it on confirmation)
  amount: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '', maxlength: 2000 },
  /*
   * Managed booking flow (KnotNest reviews both directions):
   *   pending_review   couple sent the request, KnotNest checks it
   *   requested        forwarded to the vendor
   *   vendor_accepted  vendor accepted (date held); KnotNest checks the response
   *   vendor_declined  vendor declined; KnotNest passes it on (and can suggest alternatives)
   *   awaiting_customer  approved offer is with the couple to confirm
   *   confirmed -> completed, or cancelled at any open stage
   * In "auto_verified" mode, steps with a verified vendor skip the admin review.
   */
  status: { type: String, enum: ['pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer', 'confirmed', 'cancelled', 'completed'], default: 'pending_review', index: true },
  vendorNote: { type: String, default: '', maxlength: 1000 },   // vendor's message with the response
  adminNote: { type: String, default: '', maxlength: 1000 },        // KnotNest's message to the couple
  adminNoteVendor: { type: String, default: '', maxlength: 1000 },  // KnotNest's message to the vendor
  stageAt: { type: Date, default: Date.now },                    // when the current stage started (review time tracking)
  history: [{
    _id: false,
    status: String, by: { type: String, enum: ['customer', 'vendor', 'admin', 'system'] }, note: { type: String, default: '' }, at: { type: Date, default: Date.now },
  }],
  // Advance payment (Razorpay, test mode)
  advanceAmount: { type: Number, default: 0, min: 0 },
  advancePaid: { type: Boolean, default: false },
  advancePaidAt: Date,
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
