import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
  profileImage: { type: String, default: '' },
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding' },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password); };
userSchema.set('toJSON', { transform: (_d, ret) => { delete ret.password; delete ret.__v; return ret; } });

export default mongoose.model('User', userSchema);
