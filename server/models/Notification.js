import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  type: { type: String, enum: ['enquiry', 'booking', 'review', 'vendor', 'system', 'report', 'rsvp', 'payment', 'message'], default: 'system' },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Notification', notificationSchema);
