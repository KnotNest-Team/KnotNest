import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { flagsFor, FLAG_NOTE } from '../services/moderationService.js';
import { notify, notifyAdmins } from '../services/notificationService.js';

const myVendorId = async (user) => (await Vendor.findOne({ owner: user._id }).select('_id'))?._id;

/** Loads a conversation the current user takes part in (customer or the vendor's owner). Admins use /admin/safety. */
async function participant(req) {
  const c = await Conversation.findById(req.params.id).populate('vendor', 'businessName owner images logo').populate('customer', 'name');
  if (!c) throw ApiError.notFound('Conversation not found');
  const role = req.user.role;
  const ok = (role === 'customer' && String(c.customer._id) === String(req.user._id)) || (role === 'vendor' && String(c.vendor.owner) === String(req.user._id));
  if (!ok) throw ApiError.forbidden();
  return { c, role };
}

export const list = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : { vendor: await myVendorId(req.user) };
  const conversations = await Conversation.find(filter).populate('vendor', 'businessName images logo city').populate('customer', 'name')
    .select('-report.reason -report.resolution').sort('-lastMessageAt').limit(100).lean();
  const unread = conversations.reduce((s, c) => s + (c.unread?.[req.user.role] || 0), 0);
  res.json({ conversations, unread });
});

/** Customer opens (or reopens) the thread with a vendor. */
export const start = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.body.vendor, status: 'approved' }).select('_id owner businessName');
  if (!vendor) throw ApiError.notFound('Vendor not found');
  let c = await Conversation.findOne({ customer: req.user._id, vendor: vendor._id });
  if (!c) c = await Conversation.create({ customer: req.user._id, vendor: vendor._id });
  res.status(201).json({ conversation: c });
});

export const messages = asyncHandler(async (req, res) => {
  const { c, role } = await participant(req);
  const filter = { conversation: c._id };
  if (req.query.after) filter.createdAt = { $gt: new Date(req.query.after) }; // polling: only new messages
  const list = await Message.find(filter).sort('createdAt').limit(500).select('-flags').lean();
  if (c.unread?.[role]) { c.unread[role] = 0; await c.save(); }
  res.json({ conversation: c, messages: list, notice: 'Messages may be reviewed by KnotNest only if this chat is reported, to keep everyone safe.' });
});

export const send = asyncHandler(async (req, res) => {
  const { c, role } = await participant(req);
  const text = String(req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Write a message first');
  if (text.length > 2000) throw ApiError.badRequest('Messages can be up to 2000 characters');
  const flags = flagsFor(text);
  const msg = await Message.create({ conversation: c._id, sender: req.user._id, senderRole: role, text, flags });
  const other = role === 'customer' ? 'vendor' : 'customer';
  c.lastMessage = text.slice(0, 140); c.lastMessageAt = msg.createdAt;
  c.unread[other] = (c.unread[other] || 0) + 1;
  if (flags.length) c.flaggedCount += 1;
  await c.save();
  // notify only on the first unread message, so a burst of messages doesn't flood notifications
  if (c.unread[other] === 1) {
    const to = role === 'customer' ? c.vendor.owner : c.customer._id;
    await notify(to, `New message from ${role === 'customer' ? c.customer.name : c.vendor.businessName}`, text.slice(0, 90), 'message', role === 'customer' ? '/vendor/messages' : '/customer/messages');
  }
  const { flags: _f, ...safe } = msg.toObject();
  res.status(201).json({ message: safe, note: flags.length ? FLAG_NOTE : '' });
});

/** Either side can report a conversation. Only then can an admin read it (logged in the audit trail). */
export const report = asyncHandler(async (req, res) => {
  const { c } = await participant(req);
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) throw ApiError.badRequest('Tell us briefly what went wrong (at least 5 characters)');
  c.report = { status: 'open', reason: reason.slice(0, 500), by: req.user._id, at: new Date(), resolution: '' };
  await c.save();
  await notifyAdmins('Conversation reported', `A chat with ${c.vendor.businessName} was reported.`, 'report', '/admin/safety');
  res.json({ message: 'Reported. Our team will review this conversation.' });
});
