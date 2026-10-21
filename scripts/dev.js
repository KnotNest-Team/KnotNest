/**
 * `npm run dev`: prepares server/.env, starts the API, waits until it answers, then starts Vite.
 * Waiting avoids the "http proxy error ... ECONNREFUSED" spam while the API (or the embedded DB) boots.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { setupEnv } from './setup-env.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const clientDir = path.join(root, 'client');
const C = { server: '\x1b[35m', client: '\x1b[36m', dev: '\x1b[33m', off: '\x1b[0m' };
const log = (tag, msg) => console.log(`${C[tag]}[${tag}]${C.off} ${msg}`);

setupEnv();

for (const dir of [serverDir, clientDir]) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    log('dev', `Dependencies missing in ${path.basename(dir)}/. Run \`npm install\` from the project root first.`);
    process.exit(1);
  }
}

const envFile = path.join(serverDir, '.env');
const readPort = () => {
  const m = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^PORT=(\d+)/m);
  return Number(process.env.PORT || (m && m[1]) || 5001);
};
const PORT = readPort();
const children = [];

function run(tag, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const pipe = (stream) => stream.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => {
    log(tag, l);
    // node --watch keeps running after a crash; treat that message as "the API failed to start"
    if (tag === 'server' && l.includes("Failed running 'server.js'")) apiFailed = true;
  }));
  pipe(child.stdout); pipe(child.stderr);
  child.on('exit', (code) => { if (!shuttingDown) log(tag, `exited with code ${code}`); });
  children.push(child);
  return child;
}

let shuttingDown = false;
let apiFailed = false;
const shutdown = () => { shuttingDown = true; children.forEach((c) => c.kill()); setTimeout(() => process.exit(0), 300); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

const ping = () => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health', timeout: 1500 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
  req.on('error', () => resolve(false)); req.on('timeout', () => { req.destroy(); resolve(false); });
});

log('dev', `Starting API on port ${PORT}...`);
const api = run('server', process.execPath, ['--watch', 'server.js'], serverDir);

let apiExited = false;
api.on('exit', () => { apiExited = true; });

(async () => {
  const started = Date.now();
  let ready = false;
  while (Date.now() - started < 300000 && !apiExited && !apiFailed) {
    if (await ping()) { ready = true; break; }
    await new Promise((r) => setTimeout(r, 700));
  }
  if (!ready) { log('dev', 'The API did not start. Fix the error above, then run `npm run dev` again.'); return shutdown(); }
  log('dev', `API is ready. Starting the website...`);
  const vite = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');
  run('client', process.execPath, [vite], clientDir, { VITE_PROXY_TARGET: `http://localhost:${PORT}` });
  setTimeout(() => log('dev', `Open http://localhost:5173  (API: http://localhost:${PORT})`), 1500);
})();
