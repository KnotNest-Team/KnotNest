/*imported from mongoose*/
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isProd } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_URI = 'mongodb://127.0.0.1:27017/knotnest';
let memoryServer = null;

const connect = (uri, ms = 4000) => mongoose.connect(uri, { serverSelectionTimeoutMS: ms });

/** Starts an embedded MongoDB (development only) whose data persists in server/.data/db. */
async function startEmbedded() {
  let MongoMemoryServer;
  try { ({ MongoMemoryServer } = await import('mongodb-memory-server')); } catch {
    throw new Error('Embedded MongoDB is not installed (mongodb-memory-server failed to install).');
  }
  const dbPath = path.join(__dirname, '..', '.data', 'db');
  fs.mkdirSync(dbPath, { recursive: true });
  console.log('[db] Starting embedded development MongoDB (first run downloads the MongoDB binary, ~100 MB, please wait)...');
  memoryServer = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
  return memoryServer.getUri('knotnest');
}

/**
 * Connection strategy:
 *   1. Connect to MONGO_URI (default: local mongod on 27017, or your Atlas string).
 *   2. Development only, if that fails: start an embedded MongoDB so `npm run dev` works with zero setup.
 * Control with USE_MEMORY_DB = auto (default) | true (always embedded) | false (never; fail instead).
 */
export default async function connectDB() {
  mongoose.set('strictQuery', true);
  const mode = (process.env.USE_MEMORY_DB || 'auto').toLowerCase();
  const uri = process.env.MONGO_URI || DEFAULT_URI;
  let label = uri.replace(/\/\/([^:@/]+):[^@]*@/, '//$1:***@');

  if (mode !== 'true') {
    try {
      await connect(uri);
      console.log(`[db] MongoDB connected: ${label}`);
      return { embedded: false };
    } catch (err) {
      if (isProd || mode === 'false') {
        throw new Error(`Could not connect to MongoDB at ${label}: ${err.message}`);
      }
      console.warn(`[db] No MongoDB reachable at ${label} (${err.message.split('\n')[0]}).`);
    }
  }

  try {
    const embeddedUri = await startEmbedded();
    await connect(embeddedUri, 15000);
    console.log('[db] Using embedded development MongoDB (data stored in server/.data).');
    return { embedded: true };
  } catch (err) {
    throw new Error(
      `${err.message}\n\nNo database available. Pick one:\n` +
      '  - Install and start MongoDB locally (https://www.mongodb.com/try/download/community), or\n' +
      '  - Create a free Atlas cluster and put its connection string in server/.env as MONGO_URI, or\n' +
      '  - Allow the embedded dev database to download its binary (needs internet on first run).'
    );
  }
}

export async function closeDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
