import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const maxBytes = () => (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

// Limits per upload "kind" (max files per request)
export const KINDS = {
  vendor: { max: 5, roles: ['vendor', 'admin'] },
  portfolio: { max: 12, roles: ['vendor', 'admin'] },
  category: { max: 1, roles: ['admin'] },
  review: { max: 4, roles: ['customer'] },
  profile: { max: 1, roles: ['customer', 'vendor', 'admin'] },
  content: { max: 6, roles: ['admin'] },
};

// Memory storage: the storage service decides where bytes go (local disk or Cloudinary).
export const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes(), files: 12 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(ApiError.badRequest('Only JPG, PNG or WEBP images are allowed')),
});

export const safeName = (mimetype) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[mimetype]}`;
