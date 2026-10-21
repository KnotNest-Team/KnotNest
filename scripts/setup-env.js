/**
 * Creates server/.env from server/.env.example if it does not exist, filling JWT_SECRET with a fresh random value.
 * Safe to run repeatedly; never overwrites an existing .env.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'server', '.env.example');
const target = path.join(root, 'server', '.env');

export function setupEnv() {
  if (fs.existsSync(target)) {
    const txt = fs.readFileSync(target, 'utf8');
    if (/^JWT_SECRET=\s*$/m.test(txt)) {
      fs.writeFileSync(target, txt.replace(/^JWT_SECRET=\s*$/m, `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`));
      console.log('[setup] Filled the empty JWT_SECRET in server/.env');
    }
    return false;
  }
  if (!fs.existsSync(example)) return false;
  const txt = fs.readFileSync(example, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`);
  fs.writeFileSync(target, txt);
  console.log('[setup] Created server/.env with a generated development JWT_SECRET');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) setupEnv();
