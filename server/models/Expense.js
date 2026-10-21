import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = ['Venue', 'Catering', 'Decoration', 'Photography', 'Makeup', 'Clothing', 'Jewellery', 'Invitations', 'Entertainment', 'Transportation', 'Miscellaneous'];

const expenseSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true, default: '' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
