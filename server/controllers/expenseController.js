import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import Wedding from '../models/Wedding.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';

const FIELDS = ['category', 'amount', 'description', 'date'];

export const list = asyncHandler(async (req, res) => {
  const [expenses, wedding] = await Promise.all([
    Expense.find({ customer: req.user._id }).sort('-date').lean(),
    Wedding.findOne({ customer: req.user._id }).select('budget'),
  ]);
  const byCategory = EXPENSE_CATEGORIES.map((name) => ({ name, value: expenses.filter((e) => e.category === name).reduce((s, e) => s + e.amount, 0) })).filter((c) => c.value > 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalBudget = wedding?.budget || 0;
  res.json({ expenses, byCategory, totalBudget, totalSpent, remaining: totalBudget - totalSpent });
});

export const create = asyncHandler(async (req, res) =>
  res.status(201).json({ expense: await Expense.create({ ...pick(req.body, FIELDS), customer: req.user._id }) }));

export const update = asyncHandler(async (req, res) => {
  const e = await Expense.findOneAndUpdate({ _id: req.params.id, customer: req.user._id }, pick(req.body, FIELDS), { new: true, runValidators: true });
  if (!e) throw ApiError.notFound('Expense not found');
  res.json({ expense: e });
});

export const remove = asyncHandler(async (req, res) => {
  if (!(await Expense.findOneAndDelete({ _id: req.params.id, customer: req.user._id }))) throw ApiError.notFound('Expense not found');
  res.json({ message: 'Expense deleted' });
});
