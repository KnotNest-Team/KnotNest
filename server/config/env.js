/**
 * Loads server/.env (regardless of the current working directory) and applies safe defaults.
 * Import this FIRST in every entry point (server.js, seed/seed.js).
 */
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV ||= 'development';
process.env.PORT ||= '5001';
process.env.CLIENT_URL ||= 'http://localhost:5173';
process.env.JWT_EXPIRES_IN ||= '7d';
export const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-string') {
  if (isProd) {
    console.error('\nJWT_SECRET is not set. Set a long random value in server/.env before running in production.\n');
    process.exit(1);
  }
  // Development only: a random per-process secret (sessions reset on restart). `npm install` normally
  // writes a persistent random secret into server/.env, so you rarely see this.
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[env] JWT_SECRET not set: using a temporary development secret. Run `npm run setup` to create server/.env.');
}
