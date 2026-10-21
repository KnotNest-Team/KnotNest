import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(100).lean(),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);
  res.json({ notifications, unread });
});
export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ notification: n });
});
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All marked as read' });
});
export const remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Deleted' });
});
