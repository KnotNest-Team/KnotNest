import mongoose from 'mongoose';

const { Schema } = mongoose;
/** One private thread between a couple and a vendor. */
const conversationSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  unread: { customer: { type: Number, default: 0 }, vendor: { type: Number, default: 0 } },
  flaggedCount: { type: Number, default: 0 },          // messages auto-flagged (contact details, payment IDs, abuse)
  report: {
    status: { type: String, enum: ['none', 'open', 'resolved'], default: 'none', index: true },
    reason: { type: String, default: '' },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: Date,
    resolution: { type: String, default: '' },
  },
}, { timestamps: true });

conversationSchema.index({ customer: 1, vendor: 1 }, { unique: true });
export default mongoose.model('Conversation', conversationSchema);
