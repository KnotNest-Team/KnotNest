import mongoose from 'mongoose';

const { Schema } = mongoose;
const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['customer', 'vendor'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
  flags: [{ type: String, enum: ['phone', 'email', 'upi', 'link', 'abuse'] }],
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Message', messageSchema);
