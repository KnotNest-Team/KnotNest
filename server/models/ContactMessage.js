import mongoose from 'mongoose';

export default mongoose.model('ContactMessage', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, trim: true, default: '' },
  message: { type: String, required: true, maxlength: 3000 },
}, { timestamps: { createdAt: true, updatedAt: false } }));
