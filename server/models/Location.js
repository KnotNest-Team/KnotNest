import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true },
  state: { type: String, trim: true, default: '' },
  image: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
locationSchema.index({ city: 1 }, { unique: true });
export default mongoose.model('Location', locationSchema);
