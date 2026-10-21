import { isProd } from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import User from './models/User.js';
import { runSeed } from './seed/seed.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { UPLOAD_ROOT } from './middleware/upload.js';
import { OUTBOX_DIR } from './services/emailService.js';
import { resetStuckInvites } from './services/inviteService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow the client (another origin in dev) to load /uploads images
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com', 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
    },
  },
}));
const allowed = process.env.CLIENT_URL.split(',').map((s) => s.trim());
const localhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin) || (!isProd && localhost.test(origin))),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
// Generous for a single-page app (each screen makes several calls). Tune with RATE_LIMIT_MAX.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || (isProd ? 3000 : 100000), standardHeaders: true, legacyHeaders: false }));

app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
// Development only: emails saved to the local outbox (when no SMTP is configured) open here
if (!isProd) app.get('/api/dev/outbox/:file', (req, res) => {
  if (!/^[\w-]+\.html$/.test(req.params.file)) return res.status(404).end();
  const file = path.join(OUTBOX_DIR, req.params.file);
  return fs.existsSync(file) ? res.sendFile(file) : res.status(404).json({ message: 'Email not found in the local outbox' });
});
app.use('/api', routes);

// Serve the built React app in production (npm run build, then npm start)
const dist = path.join(__dirname, '..', 'client', 'dist');
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT);

async function start() {
  await connectDB();
  await resetStuckInvites();
  // Development convenience: load demo data into an empty database (disable with AUTO_SEED=false).
  if (!isProd && process.env.AUTO_SEED !== 'false' && (await User.estimatedDocumentCount()) === 0) {
    console.log('[seed] Empty database detected, loading demo data...');
    await runSeed();
  }
  const server = app.listen(PORT, () => console.log(`KnotNest API running on http://localhost:${PORT}`));
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Change PORT in server/.env (the client proxy follows it automatically).` : e);
    process.exit(1);
  });
}

start().catch((e) => { console.error(`\nCould not start server: ${e.message}\n`); process.exit(1); });
