/**
 * Sends email through SMTP (Nodemailer). Works with any SMTP provider: Brevo, Gmail (App Password), SendGrid,
 * Mailtrap... Only server/.env changes between them.
 *
 * MAIL_MODE (optional): smtp | ethereal | outbox | auto (default)
 *   auto: SMTP when SMTP_HOST is set; otherwise in development an Ethereal test inbox (emails are caught and
 *         get a preview link, nothing reaches real people), and if Ethereal is unreachable, the "outbox":
 *         each email is saved as an .html file in server/.data/outbox and previewed at /api/dev/outbox/<file>.
 *   In production SMTP is required.
 */
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { isProd } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OUTBOX_DIR = path.join(__dirname, '..', '.data', 'outbox');

let cached = null; // { transport, mode, from }

export const publicAppUrl = () => (process.env.PUBLIC_APP_URL || process.env.CLIENT_URL.split(',')[0]).trim().replace(/\/$/, '');

function smtp() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    pool: true, maxConnections: 3, maxMessages: 100,
  });
}

async function ethereal() {
  const account = await Promise.race([
    nodemailer.createTestAccount(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Ethereal timed out')), 8000)),
  ]);
  console.log(`[mail] Using an Ethereal test inbox (${account.user}). Emails are caught, not delivered; open the preview links.`);
  return nodemailer.createTransport({ host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure, auth: { user: account.user, pass: account.pass } });
}

async function getTransport() {
  if (cached) return cached;
  const mode = (process.env.MAIL_MODE || 'auto').toLowerCase();
  const from = process.env.MAIL_FROM || 'KnotNest Invitations <invites@knotnest.local>';
  if (mode === 'smtp' || (mode === 'auto' && process.env.SMTP_HOST)) {
    if (!process.env.SMTP_HOST) throw ApiError.badRequest('MAIL_MODE=smtp but SMTP_HOST is empty in server/.env');
    cached = { transport: smtp(), mode: 'smtp', from };
  } else if (isProd) {
    throw new ApiError(503, 'Email is not set up. Add SMTP_HOST, SMTP_USER and SMTP_PASS to the server environment.');
  } else if (mode === 'outbox') {
    cached = { mode: 'outbox', from };
  } else {
    try { cached = { transport: await ethereal(), mode: 'ethereal', from }; } catch (e) {
      console.warn(`[mail] Ethereal unavailable (${e.message}). Saving emails to server/.data/outbox instead.`);
      cached = { mode: 'outbox', from };
    }
  }
  return cached;
}

export async function mailStatus() {
  const mode = (process.env.MAIL_MODE || 'auto').toLowerCase();
  if (mode === 'smtp' || (mode === 'auto' && process.env.SMTP_HOST)) return { mode: 'smtp', label: `SMTP (${process.env.SMTP_HOST})`, delivers: true };
  if (isProd) return { mode: 'none', label: 'Not configured', delivers: false };
  if (cached) return { mode: cached.mode, label: cached.mode === 'ethereal' ? 'Ethereal test inbox' : 'Local outbox (development)', delivers: false };
  return { mode: mode === 'outbox' ? 'outbox' : 'test', label: 'Test mode (development)', delivers: false };
}

/** Sends one email. Returns { previewUrl } in test modes. Throws on failure. */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const t = await getTransport();
  if (t.mode === 'outbox') {
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
    const file = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.html`;
    const banner = `<div style="font:13px Arial;background:#FFF7E0;padding:10px;border-bottom:1px solid #E7DCCB">Development outbox. To: ${to} | Subject: ${subject}</div>`;
    fs.writeFileSync(path.join(OUTBOX_DIR, file), html.replace(/<body([^>]*)>/, `<body$1>${banner}`));
    return { previewUrl: `/api/dev/outbox/${file}` };
  }
  const info = await t.transport.sendMail({ from: t.from, to, subject, html, text, replyTo });
  return { previewUrl: t.mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) || '' : '' };
}

/** Test hook: forget the cached transport (after changing env in tests). */
export const resetMail = () => { cached = null; };
