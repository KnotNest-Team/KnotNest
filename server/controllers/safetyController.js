/**
 * Admin access to private conversations and enquiry messages, under clear rules:
 *  - Reported conversations / enquiries: full text, but a reason is required and every view is logged.
 *  - Unreported conversations with auto-flags: only the flagged messages are visible (also logged).
 *  - Everything else: metadata only (who, which vendor, when, how many messages).
 */
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Enquiry from '../models/Enquiry.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageParams } from '../utils/validate.js';
import { notify } from '../services/notificationService.js';

const needReason = (req) => {
  const reason = String(req.body?.reason || req.query.reason || '').trim();
  if (reason.length < 5) throw ApiError.badRequest('Give a reason for opening this (at least 5 characters). It is saved in the audit log.');
  return reason.slice(0, 300);
};
const log = (req, action, targetType, targetId, reason = '') => AuditLog.create({ admin: req.user._id, action, targetType, targetId, reason });

export const overview = asyncHandler(async (req, res) => {
  const filter = req.query.filter === 'flagged' ? { flaggedCount: { $gt: 0 }, 'report.status': { $ne: 'open' } }
    : req.query.filter === 'resolved' ? { 'report.status': 'resolved' } : { 'report.status': 'open' };
  const { page, limit, skip } = pageParams(req.query, 15);
  const [conversations, total, counts, reportedEnquiries] = await Promise.all([
    Conversation.find(filter).populate('vendor', 'businessName city').populate('customer', 'name email').populate('report.by', 'name role')
      .select('-lastMessage').sort('-updatedAt').skip(skip).limit(limit).lean(),
    Conversation.countDocuments(filter),
    Promise.all([Conversation.countDocuments({ 'report.status': 'open' }), Conversation.countDocuments({ flaggedCount: { $gt: 0 }, 'report.status': { $ne: 'open' } }), Enquiry.countDocuments({ 'report.status': 'open' })]),
    Enquiry.find({ 'report.status': 'open' }).populate('vendor', 'businessName').populate('customer', 'name').select('-message -response').sort('-updatedAt').limit(20).lean(),
  ]);
  res.json({ conversations, total, page, pages: Math.ceil(total / limit) || 1, counts: { reported: counts[0], flagged: counts[1], enquiries: counts[2] }, reportedEnquiries });
});

/** POST so the reason travels in the body; returns messages according to the rules above. */
export const openConversation = asyncHandler(async (req, res) => {
  const reason = needReason(req);
  const c = await Conversation.findById(req.params.id).populate('vendor', 'businessName').populate('customer', 'name').lean();
  if (!c) throw ApiError.notFound('Conversation not found');
  const full = c.report?.status !== 'none';
  const all = await Message.find({ conversation: c._id }).sort('createdAt').limit(500).lean();
  const messages = full ? all : all.filter((m) => m.flags?.length);
  await log(req, full ? 'view_conversation' : 'view_flagged_messages', 'conversation', c._id, reason);
  res.json({ conversation: c, messages, scope: full ? 'full' : 'flagged-only' });
});

export const resolveConversation = asyncHandler(async (req, res) => {
  const c = await Conversation.findById(req.params.id).populate('vendor', 'businessName owner');
  if (!c) throw ApiError.notFound('Conversation not found');
  if (c.report?.status !== 'open') throw ApiError.badRequest('This conversation has no open report');
  const resolution = String(req.body.resolution || '').trim().slice(0, 500) || 'Reviewed by KnotNest';
  c.report.status = 'resolved'; c.report.resolution = resolution;
  await c.save();
  await log(req, 'resolve_report', 'conversation', c._id, resolution);
  if (c.report.by) await notify(c.report.by, 'Your report was reviewed', resolution, 'report', '');
  res.json({ conversation: c });
});

export const openEnquiry = asyncHandler(async (req, res) => {
  const reason = needReason(req);
  const e = await Enquiry.findById(req.params.id).populate('vendor', 'businessName').populate('customer', 'name email').lean();
  if (!e) throw ApiError.notFound('Enquiry not found');
  if (e.report?.status === 'none' || !e.report?.status) throw ApiError.forbidden('Enquiry messages are private. They can only be opened after the couple or vendor reports them.');
  await log(req, 'view_enquiry', 'enquiry', e._id, reason);
  res.json({ enquiry: e });
});

export const resolveEnquiry = asyncHandler(async (req, res) => {
  const e = await Enquiry.findById(req.params.id);
  if (!e || e.report?.status !== 'open') throw ApiError.badRequest('This enquiry has no open report');
  e.report.status = 'resolved'; e.report.resolution = String(req.body.resolution || 'Reviewed by KnotNest').slice(0, 500);
  await e.save();
  await log(req, 'resolve_report', 'enquiry', e._id, e.report.resolution);
  res.json({ enquiry: e });
});

export const audit = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 20);
  const [logs, total] = await Promise.all([AuditLog.find().populate('admin', 'name email').sort('-createdAt').skip(skip).limit(limit).lean(), AuditLog.countDocuments()]);
  res.json({ logs, total, page, pages: Math.ceil(total / limit) || 1 });
});
