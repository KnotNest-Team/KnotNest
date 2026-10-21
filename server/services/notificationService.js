import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const notify = (user, title, message = '', type = 'system', link = '') =>
  user ? Notification.create({ user, title, message, type, link }).catch((e) => console.error('notify failed', e.message)) : null;

export const notifyAdmins = async (title, message = '', type = 'system', link = '/admin') => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return;
  await Notification.insertMany(admins.map((a) => ({ user: a._id, title, message, type, link })));
};
