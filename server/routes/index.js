import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController.js';
import * as vendor from '../controllers/vendorController.js';
import * as category from '../controllers/categoryController.js';
import * as location from '../controllers/locationController.js';
import * as enquiry from '../controllers/enquiryController.js';
import * as booking from '../controllers/bookingController.js';
import * as review from '../controllers/reviewController.js';
import * as wedding from '../controllers/weddingController.js';
import * as expense from '../controllers/expenseController.js';
import * as favourite from '../controllers/favouriteController.js';
import * as notification from '../controllers/notificationController.js';
import * as admin from '../controllers/adminController.js';
import * as content from '../controllers/contentController.js';
import * as guest from '../controllers/guestController.js';
import * as rsvp from '../controllers/rsvpController.js';
import * as payment from '../controllers/paymentController.js';
import * as chat from '../controllers/chatController.js';
import * as safety from '../controllers/safetyController.js';
import { upload } from '../controllers/uploadController.js';
import { uploader } from '../middleware/upload.js';
import { authMiddleware, optionalAuth, adminMiddleware, vendorMiddleware, customerMiddleware, roles } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { EXPENSE_CATEGORIES } from '../models/Expense.js';
import { isProd } from '../config/env.js';

const r = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isProd ? 30 : 1000, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts, try again in a few minutes' } });

// ---------- Auth ----------
r.post('/auth/register', authLimiter, validate({
  name: { required: true, type: 'string', minLength: 2, maxLength: 80 }, email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 6, maxLength: 100 }, phone: { type: 'string', maxLength: 20 },
}), auth.register);
r.post('/auth/login', authLimiter, validate({ email: { required: true, type: 'email' }, password: { required: true, type: 'string' } }), auth.login);
r.get('/auth/me', authMiddleware, auth.me);
r.put('/auth/me', authMiddleware, validate({ name: { type: 'string', minLength: 2, maxLength: 80 } }), auth.updateMe);
r.put('/auth/password', authMiddleware, validate({ currentPassword: { required: true, type: 'string' }, newPassword: { required: true, type: 'string', minLength: 6 } }), auth.changePassword);
r.post('/auth/logout', auth.logout);

// ---------- Vendors ----------
r.get('/vendors', vendor.list);
r.get('/vendors/compare', vendor.compare);
r.get('/vendors/me/profile', authMiddleware, vendorMiddleware, vendor.myProfile);
r.get('/vendors/me/analytics', authMiddleware, vendorMiddleware, vendor.myAnalytics);
r.get('/vendors/:id', optionalAuth, vendor.getOne);
r.post('/vendors', authMiddleware, adminMiddleware, validate({ businessName: { required: true, type: 'string' }, category: { required: true, type: 'string' } }), vendor.create);
r.put('/vendors/:id', authMiddleware, roles('vendor', 'admin'), vendor.update);
r.delete('/vendors/:id', authMiddleware, adminMiddleware, vendor.remove);

// ---------- Categories & locations ----------
r.get('/categories', optionalAuth, category.list);
r.post('/categories', authMiddleware, adminMiddleware, validate({ name: { required: true, type: 'string' } }), category.create);
r.put('/categories/:id', authMiddleware, adminMiddleware, category.update);
r.delete('/categories/:id', authMiddleware, adminMiddleware, category.remove);
r.get('/locations', optionalAuth, location.list);
r.post('/locations', authMiddleware, adminMiddleware, validate({ city: { required: true, type: 'string' } }), location.create);
r.put('/locations/:id', authMiddleware, adminMiddleware, location.update);
r.delete('/locations/:id', authMiddleware, adminMiddleware, location.remove);

// ---------- Enquiries ----------
r.post('/enquiries', authMiddleware, customerMiddleware, validate({
  vendor: { required: true, type: 'string' }, name: { required: true, type: 'string' }, email: { required: true, type: 'email' },
  phone: { required: true, type: 'string', minLength: 7, maxLength: 20 }, message: { required: true, type: 'string', minLength: 5, maxLength: 2000 },
  weddingDate: { type: 'date' }, guestCount: { type: 'number', min: 0 },
}), enquiry.create);
r.get('/enquiries', authMiddleware, enquiry.list);
r.put('/enquiries/:id', authMiddleware, roles('vendor', 'admin'), enquiry.update);
r.post('/enquiries/:id/report', authMiddleware, roles('customer', 'vendor'), enquiry.report);

// ---------- Bookings ----------
r.post('/bookings', authMiddleware, customerMiddleware, validate({
  vendor: { required: true, type: 'string' }, weddingDate: { type: 'date' }, amount: { type: 'number', min: 0 }, expectedTotal: { type: 'number', min: 0 },
}), booking.create);
// flexible wedding bookings: live quote, vendors free for a selection, several vendors in one checkout
r.get('/bookings/plan', authMiddleware, customerMiddleware, booking.plan);
r.post('/bookings/quote', authMiddleware, customerMiddleware, booking.quote);
r.post('/bookings/available-vendors', authMiddleware, customerMiddleware, validate({ category: { required: true, type: 'string' }, days: { required: true, type: 'array' } }), booking.availableVendors);
r.post('/bookings/checkout', authMiddleware, customerMiddleware, validate({ items: { required: true, type: 'array' }, expectedTotal: { type: 'number', min: 0 } }), booking.checkout);
r.get('/bookings', authMiddleware, booking.list);
r.put('/bookings/:id', authMiddleware, validate({ status: { required: true, type: 'string' } }), booking.update);

// ---------- Payments (booking advance, Razorpay test mode) ----------
r.get('/payments/config', authMiddleware, payment.config);
r.post('/payments/order', authMiddleware, customerMiddleware, validate({ booking: { required: true, type: 'string' } }), payment.createOrder);
r.post('/payments/verify', authMiddleware, customerMiddleware, validate({ orderId: { required: true, type: 'string' } }), payment.verify);

// ---------- Reviews ----------
r.get('/reviews/vendor/:vendorId', review.forVendor);
r.get('/reviews', authMiddleware, review.list);
r.post('/reviews', authMiddleware, customerMiddleware, validate({
  booking: { required: true, type: 'string' }, rating: { required: true, type: 'number', min: 1, max: 5 }, comment: { required: true, type: 'string', minLength: 3, maxLength: 2000 },
}), review.create);
r.put('/reviews/:id/reply', authMiddleware, vendorMiddleware, review.reply);
r.put('/reviews/:id/report', authMiddleware, vendorMiddleware, review.report);
r.put('/reviews/:id', authMiddleware, adminMiddleware, review.moderate);
r.delete('/reviews/:id', authMiddleware, adminMiddleware, review.remove);

// ---------- Wedding planner & budget (customer) ----------
const cust = [authMiddleware, customerMiddleware];
r.get('/wedding/summary', ...cust, wedding.summary);
r.get('/wedding', ...cust, wedding.get);
r.post('/wedding', ...cust, validate({ guestCount: { type: 'number', min: 0 }, budget: { type: 'number', min: 0 }, weddingDate: { type: 'date' } }), wedding.create);
r.put('/wedding', ...cust, validate({ guestCount: { type: 'number', min: 0 }, budget: { type: 'number', min: 0 }, weddingDate: { type: 'date' } }), wedding.update);
r.post('/wedding/checklist', ...cust, wedding.addTask);
r.put('/wedding/checklist/:taskId', ...cust, wedding.updateTask);
r.delete('/wedding/checklist/:taskId', ...cust, wedding.deleteTask);
const eventRules = { name: { required: true, type: 'string', minLength: 2, maxLength: 60 }, date: { required: true, type: 'date' } };
r.get('/wedding/traditions', ...cust, wedding.traditions);
r.post('/wedding/events/plan', ...cust, wedding.plan);
r.post('/wedding/events/apply', ...cust, wedding.applyPlan);
r.post('/wedding/events', ...cust, validate(eventRules), wedding.addEvent);
r.put('/wedding/events/:eventId', ...cust, validate(eventRules), wedding.updateEvent);
r.delete('/wedding/events/:eventId', ...cust, wedding.deleteEvent);

// ---------- Guest list & invitations (customer) ----------
r.get('/wedding/guests', ...cust, guest.list);
r.post('/wedding/guests', ...cust, guest.create);
r.post('/wedding/guests/import', ...cust, guest.importMany);
r.put('/wedding/guests/:id', ...cust, guest.update);
r.delete('/wedding/guests/:id', ...cust, guest.remove);
const mailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: isProd ? 20 : 1000, message: { message: 'Too many sends. Try again in an hour.' } });
r.post('/wedding/invites/send', ...cust, mailLimiter, guest.send);
r.post('/wedding/invites/remind', ...cust, mailLimiter, guest.remind);
r.get('/wedding/invites/preview', ...cust, guest.preview);
r.get('/wedding/rsvp-preview', ...cust, rsvp.preview);

// ---------- Public RSVP (no login; the unguessable token is the key) ----------
const rsvpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isProd ? 60 : 1000, standardHeaders: true, legacyHeaders: false });
r.get('/rsvp/:token', rsvpLimiter, rsvp.get);
r.post('/rsvp/:token', rsvpLimiter, rsvp.respond);

const expenseRules = { category: { required: true, type: 'string', oneOf: EXPENSE_CATEGORIES }, amount: { required: true, type: 'number', min: 0 } };
r.get('/expenses', ...cust, expense.list);
r.post('/expenses', ...cust, validate(expenseRules), expense.create);
r.put('/expenses/:id', ...cust, validate(expenseRules), expense.update);
r.delete('/expenses/:id', ...cust, expense.remove);

r.get('/favourites', ...cust, favourite.list);
r.post('/favourites/:vendorId', ...cust, favourite.toggle);

// ---------- Messages (couple <-> vendor) ----------
r.get('/conversations', authMiddleware, roles('customer', 'vendor'), chat.list);
r.post('/conversations', authMiddleware, customerMiddleware, validate({ vendor: { required: true, type: 'string' } }), chat.start);
r.get('/conversations/:id/messages', authMiddleware, roles('customer', 'vendor'), chat.messages);
r.post('/conversations/:id/messages', authMiddleware, roles('customer', 'vendor'), rateLimit({ windowMs: 60 * 1000, max: isProd ? 30 : 1000 }), chat.send);
r.post('/conversations/:id/report', authMiddleware, roles('customer', 'vendor'), chat.report);

// ---------- Notifications ----------
r.get('/notifications', authMiddleware, notification.list);
r.put('/notifications/read-all', authMiddleware, notification.markAllRead);
r.put('/notifications/:id/read', authMiddleware, notification.markRead);
r.delete('/notifications/:id', authMiddleware, notification.remove);

// ---------- Uploads ----------
r.post('/uploads/:kind', authMiddleware, uploader.array('files', 12), upload);

// ---------- Public content ----------
r.get('/content/home', content.home);
r.post('/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: isProd ? 10 : 1000 }), validate({
  name: { required: true, type: 'string' }, email: { required: true, type: 'email' }, message: { required: true, type: 'string', minLength: 5 },
}), content.contact);

// ---------- Admin ----------
const adm = [authMiddleware, adminMiddleware];
r.get('/admin/dashboard', ...adm, admin.dashboard);
r.get('/admin/reports', ...adm, admin.reports);
r.get('/admin/users', ...adm, admin.users);
r.get('/admin/users/:id', ...adm, admin.userDetail);
r.put('/admin/users/:id', ...adm, admin.updateUser);
r.delete('/admin/users/:id', ...adm, admin.deleteUser);
r.get('/admin/vendors', ...adm, admin.vendors);
r.put('/admin/vendors/:id/moderate', ...adm, vendor.moderate);
r.get('/admin/bookings', ...adm, admin.bookings);
r.get('/admin/enquiries', ...adm, admin.enquiries);
r.get('/admin/content', ...adm, content.adminGet);
r.put('/admin/content', ...adm, content.adminUpdate);
r.get('/admin/messages', ...adm, content.contactMessages);
r.delete('/admin/messages/:id', ...adm, content.deleteContactMessage);
r.get('/admin/safety', ...adm, safety.overview);
r.post('/admin/safety/conversations/:id/open', ...adm, safety.openConversation);
r.put('/admin/safety/conversations/:id/resolve', ...adm, safety.resolveConversation);
r.post('/admin/safety/enquiries/:id/open', ...adm, safety.openEnquiry);
r.put('/admin/safety/enquiries/:id/resolve', ...adm, safety.resolveEnquiry);
r.get('/admin/audit', ...adm, safety.audit);
r.get('/admin/booking-reviews', ...adm, booking.reviewQueue);
r.get('/admin/settings/platform', ...adm, admin.getPlatformSettings);
r.put('/admin/settings/platform', ...adm, admin.updatePlatformSettings);
r.get('/admin/booking-stats', ...adm, admin.bookingStats);

export default r;
