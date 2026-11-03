# Developing KnotNest on Windows

This guide covers setting up, running and testing KnotNest on Windows 10 or 11. The README has the short version. This one adds what is specific to Windows, how to keep your development database away from shared or live data, and fixes for common problems.

## What was checked

Each command in this guide is marked with how it was checked:

- **[verified]** — run on Windows 11 with Node 24.16.0, npm 11.16.0 and Git 2.54 while this guide was written (November 2026), with the result shown.
- **[from source]** — read from the code (`package.json`, `scripts/`, `server/config/`) but not run while writing this guide. For example, `npm run dev` was not started, because on an empty database it loads demo data automatically.

## Contents

1. [Prerequisites](#1-prerequisites)
2. [First-time setup](#2-first-time-setup)
3. [Environment variables](#3-environment-variables)
4. [Keep the database local](#4-keep-the-database-local)
5. [Run the app](#5-run-the-app)
6. [Tests](#6-tests)
7. [Frontend builds](#7-frontend-builds)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 18.12 or newer (`engines` in `package.json`). The LTS installer from nodejs.org includes npm. | `node -v` **[verified: v24.16.0]** |
| npm | Comes with Node. | `npm -v` **[verified: 11.16.0]** |
| Git for Windows | Any recent version. | `git --version` **[verified: 2.54.0.windows.1]** |
| MongoDB Community Server | *Optional.* Without it, the server starts an embedded MongoDB for you (see [section 4](#4-keep-the-database-local)). | `mongod --version` |

You do not need Python, Visual Studio Build Tools or any other native build toolchain. The project has no native add-ons.

**Which shell?** Every command below works in **Windows PowerShell 5.1** (the default) and in PowerShell 7. Where Command Prompt or Git Bash needs a different syntax, both versions are shown.

---

## 2. First-time setup

```powershell
git clone https://github.com/KnotNest-Team/KnotNest.git
cd KnotNest
npm install
```

`npm install` at the root runs a `postinstall` step **[from source: package.json]** that:

1. installs `server/` dependencies (`npm install --prefix server`), including the optional `mongodb-memory-server` and `cloudinary`;
2. installs `client/` dependencies (`npm install --prefix client`);
3. runs `node scripts/setup-env.js`. This copies `server/.env.example` to `server/.env` and fills `JWT_SECRET` with a random 64-character hex value. It **never overwrites** an existing `server/.env`. If `JWT_SECRET=` exists but is empty, it fills it in.

You can run step 3 on its own at any time: `npm run setup`.

> The root `.gitignore` excludes `.env`, `node_modules`, `dist`, `server/.data` and uploaded files. Run `git status` before committing to make sure `server/.env` is not listed.

---

## 3. Environment variables

The server reads only **`server/.env`** ([server/config/env.js](../server/config/env.js) loads it by absolute path, so the folder you run from does not matter). The root `.env.example` just points to `server/.env.example`, which documents every variable.

### Development values

| Variable | Recommended locally | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` turns off the embedded database, demo data, the dev outbox route and simulated payments, and makes `JWT_SECRET` mandatory. |
| `PORT` | `5001` | The Vite proxy reads this from `server/.env`, so the client follows it automatically. |
| `CLIENT_URL` | `http://localhost:5173` | CORS allow-list (comma-separated). In development, any `localhost` or `127.0.0.1` origin is allowed anyway. |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/knotnest` | See [section 4](#4-keep-the-database-local). Never put a shared or production connection string here. |
| `USE_MEMORY_DB` | `auto` or `true` | `auto`: use `MONGO_URI`, and if it cannot be reached, start an embedded database. `true`: always embedded. `false`: fail instead. |
| `AUTO_SEED` | `true` | Loads demo data **only when the database has no users**, and only in development. |
| `JWT_SECRET` | generated | Leave it as `setup-env.js` wrote it. Changing it signs everyone out. |
| `JWT_EXPIRES_IN` | `7d` | |
| `RATE_LIMIT_MAX` | unset | The development default is 100000 requests per 15 minutes. |
| `STORAGE_PROVIDER` | `local` | Uploads go to `server/uploads/` (gitignored). |
| `MAX_FILE_SIZE_MB` | `5` | |
| `CLOUDINARY_*` | empty | Only used when `STORAGE_PROVIDER=cloudinary`. |
| `PUBLIC_APP_URL` | empty | Used for RSVP links in emails. Defaults to the first `CLIENT_URL`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | **empty** | Leave these empty so no real email is sent. See below. |
| `MAIL_FROM` | default | |
| `MAIL_MODE` | `outbox` (recommended) or `auto` | See below. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **empty** | Empty means simulated payments, clearly labelled in the UI. |
| `ADVANCE_PERCENT`, `COMMISSION_PERCENT` | `10`, `8` | |

Optional client settings (`client/.env`, see `client/.env.example`): `VITE_API_URL` and `VITE_API_ORIGIN` are only needed when the API is on another host. `VITE_PROXY_TARGET` overrides where the Vite dev proxy sends `/api`.

### Email and payments stay local

| Setting | What happens in development **[from source: server/services/emailService.js, paymentController.js]** |
|---|---|
| `MAIL_MODE=outbox` | Invitation emails are written as HTML files to `server/.data/outbox/` and open at `http://localhost:5001/api/dev/outbox/<file>.html`. **Nothing leaves your machine.** |
| `MAIL_MODE=auto` with `SMTP_HOST` empty | The server creates an **Ethereal** test account over the internet, and the emails are viewable there. None reach real inboxes, but this does contact ethereal.email. If that fails (for example offline), it falls back to the outbox. |
| `SMTP_HOST` set, or `MAIL_MODE=smtp` | **Real email is delivered.** Do not use this with real guest lists in development. |
| Razorpay keys empty | `GET /api/payments/config` reports `mode: "demo"`. The advance is recorded as a simulated payment, and no payment provider is contacted. |

To make sure nothing goes out during local testing, set `MAIL_MODE=outbox` and leave `SMTP_*` and `RAZORPAY_*` empty.

### Editing `server/.env` from PowerShell

Open it in an editor (`code server\.env` or `notepad server\.env`). If you write it from a script, use `Set-Content -Encoding utf8` or `Out-File -Encoding utf8`. Windows PowerShell 5.1's `Set-Content` writes in the ANSI code page by default, which breaks non-ASCII characters such as the `₹` in `MAIL_FROM` text.

---

## 4. Keep the database local

Connection order **[from source: server/config/db.js]**:

1. Connect to `MONGO_URI` (default `mongodb://127.0.0.1:27017/knotnest`). The timeout is 4 seconds.
2. If that fails, and `NODE_ENV` is not `production` and `USE_MEMORY_DB` is not `false`, start an **embedded MongoDB** whose data lives in `server/.data/db`.

### Option A: embedded database (no install)

Set `USE_MEMORY_DB=true` in `server/.env`. The first start downloads a MongoDB binary (about 100 MB) into the npm cache. After that it works offline. Its data stays in `server/.data/db` (gitignored) and is kept between restarts.

To start over with an empty database, stop the server, then:

```powershell
Remove-Item -Recurse -Force server\.data\db
```

The next start finds no users and loads demo data again (if `AUTO_SEED=true`).

### Option B: local MongoDB service

Install MongoDB Community Server with "Install as a Service" ticked. It then listens on `127.0.0.1:27017`, which matches the default `MONGO_URI`. To check it is running:

```powershell
Get-Service MongoDB
Test-NetConnection 127.0.0.1 -Port 27017   # TcpTestSucceeded : True
```

To give a separate experiment its own database, change only the database name: `mongodb://127.0.0.1:27017/knotnest_scratch`.

### Rules that keep shared data safe

- **`npm run seed` deletes every collection** in the database it connects to, then loads demo data. There is **no production check** in `server/seed/seed.js`: it uses whatever `MONGO_URI` says. Before running it, check:

  ```powershell
  Select-String -Path server\.env -Pattern '^(NODE_ENV|MONGO_URI|USE_MEMORY_DB)='
  ```

  Only continue if `MONGO_URI` points at `127.0.0.1` or `localhost`, or `USE_MEMORY_DB=true`.
- Keep the deployed site's Atlas connection string out of `server/.env`. It belongs only in the hosting provider's environment settings (see [DEPLOYMENT.md](../DEPLOYMENT.md)).
- A `mongodb+srv://` value in your `MONGO_URI` means a cloud cluster. Do not run seed or API tests against it unless you created that cluster just for testing.
- The server prints which database it is using when it starts: `[db] MongoDB connected: mongodb://127.0.0.1:27017/knotnest` or `[db] Using embedded development MongoDB`. Passwords in the URI are shown as `***`.

---

## 5. Run the app

```powershell
npm run dev
```

**[from source: scripts/dev.js]** This command:

1. creates `server/.env` if it is missing;
2. stops with a message if `server/node_modules` or `client/node_modules` is missing (run `npm install` first);
3. starts the API with `node --watch server.js`, which restarts it whenever a server file changes;
4. checks `http://127.0.0.1:<PORT>/api/health` until it answers (giving up after 5 minutes, or straight away if the API crashes);
5. then starts Vite on `http://localhost:5173`, proxying `/api` and `/uploads` to the API.

Press `Ctrl+C` to stop both.

Other ways to run it:

| Command | What it does |
|---|---|
| `npm run server` | API only, with watch. |
| `npm run client` | Vite only. It expects the API to be running already. |
| `npm run build` then `npm start` | Production-style: Express serves `client/dist`. On its own this still runs in development mode. Set `NODE_ENV=production` (see [section 7](#7-frontend-builds)). |

When the database is empty, the server loads demo data automatically, with these accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@knotnest.com` | `Admin@123` |
| Customer | `user@knotnest.com` | `User@123` |
| Vendor (approved) | `vendor@knotnest.com` | `Vendor@123` |
| Vendor (pending approval) | `pending@knotnest.com` | `Vendor@123` |

These are development-only credentials from `server/seed/seed.js`. Never create them on a shared or live database.

---

## 6. Tests

All test files are plain Node scripts in `server/tests/` with no test framework. Each one exits with code `0` when everything passes and `1` when a test fails.

| Command (from the repository root) | Needs | Result while writing this guide |
|---|---|---|
| `npm run test:unit` (`node server/tests/pricing.unit.test.js`) | nothing | **[verified]** `25 passed, 0 failed` |
| `node server/tests/pricing.regression.test.js` | nothing | **[verified]** `34 passed, 0 failed` |
| `node server/tests/availability.regression.test.js` | nothing | **[verified]** `26 passed, 0 failed` |
| `npm run test:api` (`node server/tests/smoke.test.js`) | a running API **with demo data** | not run (see below) |
| `npm test` | unit tests, then the API smoke test | not run |

To run all three tests that need no database in one go:

```powershell
node server/tests/pricing.unit.test.js; if ($?) { node server/tests/pricing.regression.test.js }; if ($?) { node server/tests/availability.regression.test.js }
```

Windows PowerShell 5.1 does not support `&&`. Use `; if ($?) { ... }` as above, or in Command Prompt or Git Bash:

```bat
node server/tests/pricing.unit.test.js && node server/tests/pricing.regression.test.js && node server/tests/availability.regression.test.js
```

To check the exit code after a run: `$LASTEXITCODE` (PowerShell), `echo %ERRORLEVEL%` (Command Prompt), `echo $?` (Git Bash).

### The API smoke test writes data

`server/tests/smoke.test.js` logs in with the demo accounts and **creates records**: users, a vendor, enquiries, bookings, reviews and contact messages. It targets `http://localhost:<PORT>/api`, or `API_URL` if you set it. Only run it against a local database you are happy to reset:

```powershell
# terminal 1: local database only (check section 4 first)
npm run dev
# terminal 2
npm run test:api
```

Never set `API_URL` to the deployed site.

---

## 7. Frontend builds

```powershell
npm run build          # same as: npm run build --prefix client  (vite build)
```

**[verified]** The build finishes in about 9 seconds and writes to `client/dist/` (gitignored). Vite prints this warning, which is expected and does not fail the build:

```
(!) Some chunks are larger than 500 kB after minification.
```

The main bundle is about 790 kB (225 kB gzipped).

To try the production bundle locally:

```powershell
npm run preview --prefix client      # Vite preview on http://localhost:4173, proxies /api to the API
```

Or have Express serve it, the way the deployed site does. These lines change the environment of the current PowerShell window only:

```powershell
$env:NODE_ENV = 'production'; npm start
Remove-Item Env:NODE_ENV             # undo when you are done
```

In production mode the server refuses to start without a `JWT_SECRET`, never starts the embedded database, and never loads demo data. With a local `MONGO_URI` that is not running, it **fails** instead of falling back. In Command Prompt use `set NODE_ENV=production && npm start`. In Git Bash use `NODE_ENV=production npm start`.

---

## 8. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `npm : File C:\...\npm.ps1 cannot be loaded because running scripts is disabled on this system` | PowerShell execution policy. Either run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or call `npm.cmd` instead of `npm`. |
| Red `NativeCommandError` text around normal output, for example after `npm run build 2>&1` | Windows PowerShell 5.1 wraps anything a native program writes to stderr. Vite writes its warnings there. Check `$LASTEXITCODE`: `0` means it succeeded. Leave out `2>&1` to avoid the noise. |
| `Port 5001 is already in use. Change PORT in server/.env` | Another API is still running. Find it with `Get-NetTCPConnection -LocalPort 5001 \| Select-Object OwningProcess` and stop it (`Stop-Process -Id <pid>`), or change `PORT`. The client proxy follows the new port. |
| Vite picks 5174 instead of 5173 | 5173 is taken, often by an old `npm run dev`. Close it, or add the new origin to `CLIENT_URL` if you use a non-localhost host. |
| `[db] Starting embedded development MongoDB (first run downloads ...)` then hangs or fails | The first download needs internet access, and a proxy or antivirus may be blocking it. Install MongoDB locally (Option B), or try again on another network. Windows Defender can slow the first extraction a lot. |
| `Could not connect to MongoDB at ...` | `USE_MEMORY_DB=false` or `NODE_ENV=production` with no database reachable. Start the `MongoDB` service, or set `USE_MEMORY_DB=auto`. |
| `Embedded MongoDB is not installed (mongodb-memory-server failed to install)` | The optional dependency was skipped. Run `npm install --prefix server`, or use a local MongoDB. |
| `The API did not start. Fix the error above, then run npm run dev again.` | `scripts/dev.js` saw the API crash. Scroll up to the `[server]` lines for the real error. |
| Everyone is signed out after a restart | `JWT_SECRET` is empty, so a temporary one is made on each start (`[env] JWT_SECRET not set` warning). Run `npm run setup` to write a permanent one. |
| `Dependencies missing in server/` or `client/` | Run `npm install` from the **root** folder, not inside `client/` or `server/`. |
| `EPERM` / `EBUSY` during `npm install` | A running `node` process, editor or antivirus has a file locked. Stop `npm run dev`, close terminals that are inside `node_modules`, and try again. |
| Paths over 260 characters fail (rare, deep `node_modules`) | Clone closer to the drive root (for example `C:\dev\KnotNest`), or turn on long paths: `git config --global core.longpaths true`, plus the Windows "Enable Win32 long paths" policy. |
| `git status` shows every file as modified after cloning | Line-ending conversion. Check `git config core.autocrlf`. Git for Windows defaults to `true`, which is fine as long as everyone on the team uses the same setting. |
| Uploaded images do not show in development | Uploads are served by the API at `/uploads/...` and proxied by Vite. Check that the API is running and that the file exists under `server/uploads/`. |
| Invitation emails "sent" but nobody received them | Expected in development (outbox or Ethereal). Open them from the Guests page, or from `server/.data/outbox/`. |
