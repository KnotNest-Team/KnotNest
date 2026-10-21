import mongoose from 'mongoose';

const { Schema } = mongoose;
/** Every time an admin opens private content (a reported chat or enquiry) it is written here. */
const auditSchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },                    // e.g. 'view_conversation', 'resolve_report'
  targetType: { type: String, enum: ['conversation', 'enquiry'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, default: '', maxlength: 300 },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('AuditLog', auditSchema);
