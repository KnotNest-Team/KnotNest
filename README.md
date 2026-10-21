# KnotNest — Plan Your Perfect Beginning.

A full-stack **MERN** wedding planning platform and vendor marketplace for Indian weddings.
Couples discover and book vendors and plan their wedding; vendors run their business; admins manage everything.
The landing page is a production port of the supplied WedPlan prototype (same tokens, fonts, spacing and motion), rebranded KnotNest.

## What's new in 1.6: flexible wedding bookings and discounts

- **Book by day or by event.** Wedding events are grouped by date. For each day a couple books the **entire day** (every event the vendor covers, as a package) or **selects individual events**, across as many days as they like.
- **Plan & book** (`/customer/book`): pick wedding days → choose entire day or events → pick vendors per service (one vendor for everything, or a different vendor per event) → review → one checkout. One booking is created per vendor, linked by a checkout id and the couple's wedding. The draft survives a page refresh.
- **Vendor profile "Book now"** uses the same day/event picker, plus whole dates without planned events (the older form still works).
- **Live, server-side pricing.** `POST /api/bookings/quote` prices every change; the browser never sends prices. Checkout rejects a stale price (`expectedTotal`) with HTTP 409.
- **Discount engine** (`server/services/pricingEngine.js`): full-day, multi-event tiers, multi-day (across the whole checkout) and returning-couple discounts, calculated on the eligible subtotal (never compounded), with configurable stacking (`stack`/`best`), priority order and a maximum combined discount. Full-day and multi-event discounts never apply to the same day; an event is never charged twice. Repeat discounts count only the couple's **confirmed/completed** bookings, read from the database.
- **Pricing snapshot.** Each booking stores every event's price, the discounts with reasons, the rules used, and any vendor/admin price change. The price is locked when the couple confirms, so later price or rule changes never alter it.
- **Vendor rules** (`/vendor/pricing`): price per event, the events the vendor covers, and whether (and at what price) they sell full-day packages.
- **Time-slot availability.** Full-day and whole-date bookings hold the vendor's whole day. Event bookings hold only that event's time (start time + configurable slot length), so a vendor can take a morning haldi and an evening sangeet for different couples. Holds use an optimistic version check plus a lock, so overlapping acceptances can't both win.
- **Changed plans.** If a couple moves or removes a booked event, the booking keeps its date, time and price and gets an alert; the vendor and KnotNest are notified.
- **Admin:** `/admin/discounts` for every rule; the dashboard shows total, full-day, individual-event and multi-day bookings, discounts granted, final revenue and the status breakdown.
- **Vendor bookings** can be grouped by wedding, date, event, customer or status.
- **Tests:** `npm run test:unit` (discount engine, no database) and `npm test` (unit tests plus the API smoke test, 212 checks, including every booking scenario from the brief).

Older bookings keep working. They show as "Earlier format" with their per-day prices.

## What's new in 1.5: multi-day bookings and themed invitations

| Area | Change |
|---|---|
| **Multi-day bookings** | One booking can cover several days (e.g. a venue for sangeet, wedding and reception, or a decorator for every function). Pick days on the calendar or tick your events; each day has its own event, package and price, and the total is their sum. The vendor holds **all** days at once or none (atomic), cancelling releases every day, and there is one review, one confirmation and one advance. A confirmed venue fills in every linked event's venue. |
| **Themed invitations** | Nine original RSVP designs, chosen automatically from the tradition: **Royal Rajasthani** (palace arch, decorated elephants, marigold toran), **Gujarati Bandhani** (bandhani dots, dandiya), **Marathi Paithani** (peacocks, lotus), **Punjabi Phulkari** (phulkari, dhol), **South Indian Temple** (banana leaves, brass diya, kolam), **Bengali Alpana** (alpana, shankha, lotus), **Emerald Nikah** (lanterns, jaali), **Ivory Chapel** (doves, bells) and **Modern Botanical**. Swaying garlands, falling petals, flickering lamps and a petal shower on RSVP; all motion respects reduced-motion settings. Invitation emails use the same palette. |
| **Invitation design page** | Couples preview their RSVP page exactly as guests see it, switch designs live, and keep or reset to "follow my tradition". All illustrations are original SVG drawn for KnotNest (`client/src/rsvp/art.jsx`). |

## What's new in 1.4: managed bookings

KnotNest now works as a **managed marketplace**: every booking request is reviewed by KnotNest before it reaches the vendor, and every vendor reply is reviewed before it reaches the couple. See **[BUSINESS_MODEL.md](BUSINESS_MODEL.md)** for the full business model.

| Area | Change |
|---|---|
| **Booking flow** | `pending_review` (KnotNest checks) → `requested` (with vendor) → `vendor_accepted` / `vendor_declined` (KnotNest checks) → `awaiting_customer` (couple confirms) → `confirmed` → advance → `completed`. The vendor's date is held atomically on acceptance and released on cancellation. |
| **Admin → Booking reviews** | Queue of everything waiting for KnotNest, oldest first, with waiting time, overdue highlighting, automatic checks (verified vendor, listed price) and the full timeline. Approve / reject (reason required) / forward offers / pass on declines with alternatives. |
| **Approval mode** | Switch between **Manual** (review everything) and **Automatic for verified vendors** (verified vendors skip review; price changes and declines still come to the admin), plus a review-time target. |
| **Vendors** | Accept with an optional new price and message, or decline with a reason. Vendors never see requests still under review. |
| **Couples** | Clear stages ("KnotNest reviewing", "With vendor", "Ready to confirm"), the vendor's message, KnotNest's note, a **booking timeline**, and a **Confirm booking** step before paying the advance. |

## What's new in 1.1

| Area | Change |
|---|---|
| **Bookings** | Price is set by the server from the vendor's package (never from the request). Past dates and duplicate open requests are rejected. Vendors can mark an event completed only on or after its date (admins can correct records). Date confirmation is atomic, so two confirmations for one date can never both succeed. |
| **Tradition-based planning** | 13 traditions (Gujarati, Marathi, Punjabi, Sikh, Rajasthani/Marwari, Tamil, Telugu, Kannada, Malayali, Bengali, Nikah, Christian, Modern). Pick the bride's and groom's family traditions, the date and an optional muhurat: KnotNest plans every function with its usual day, time, host side and a short meaning, merges two-culture weddings, dates the checklist back from the wedding, and invites existing guests by side. A preview lets the couple untick, rename, re-date or add their own events; existing events are never overwritten, and moving the wedding date can shift all events while keeping personal edits. Templates live in `server/data/weddingTraditions.js`. |
| **Multi-event weddings** | A wedding has events (haldi, mehendi, sangeet, wedding, reception...) with date, time, venue, address, map link and dress code. Bookings can be linked to an event; a confirmed **venue** booking fills that event's venue and stays in sync. |
| **Guests & RSVP** | Guest list (add, edit, bulk import from a spreadsheet), per-event invitations, optional table/seat. Each guest gets a **personal designed invitation email** and an unguessable RSVP link that opens **without signing in**. Guests answer per event with headcount, food preference and a note, and can change answers later. Live attending / declined / pending counts per event, reminders to guests who haven't replied, WhatsApp share and copy-link for guests without email. |
| **Email (SMTP)** | Nodemailer: any SMTP provider (Brevo, Gmail App Password...) through `server/.env`. Every guest gets an individual email, sent in the background in small batches. Without SMTP in development: Ethereal test inbox, or a local outbox you can open from the Guests page. |
| **Payments** | Razorpay (test mode) booking advance: server-created order, HMAC signature verification, commission recorded per payment, earnings on the admin Reports page. Without keys in development, a clearly labelled simulated payment. |
| **Messages & safety** | Couple-vendor chat. Phone numbers, UPI IDs, emails, links and abusive words are auto-flagged. Either side can report a chat or enquiry. Admins read full content **only for reported items** (flagged messages only for unreported chats), must give a reason, and every access is written to an **audit log**. The admin enquiry list no longer shows message text. |
| **Deploy** | `render.yaml` (one service: API + website) and `client/vercel.json` (split hosting). See [DEPLOYMENT.md](DEPLOYMENT.md). |

## Features

| Area | What works (all backed by MongoDB) |
|---|---|
| **Public site** | Editorial landing page (hero, categories, real-weddings carousel, featured vendors, how it works, testimonials, video journal), marketplace with search / category / city / price / rating / verified / availability filters, sorting and pagination, vendor profile (masonry portfolio, services, packages, availability calendar, reviews, map), inspiration stories, About, Contact |
| **Customer** | Register / login, wedding profile with events, guest list + email invitations + RSVP tracking, messages with vendors, advance payment, checklist (add / edit / delete / complete + progress), budget tracker with charts and expenses, favourites, compare (up to 4), enquiries, bookings (request / cancel), reviews (only after a completed booking), notifications, profile, password change |
| **Vendor** | Messages with couples, advance-paid badges on bookings, business profile, services, packages, portfolio upload, availability calendar, enquiry inbox (accept / reject / contacted / reply), booking workflow (accept / reject / complete), review replies and reporting, analytics (views, enquiries, bookings, revenue) |
| **Admin** | Safety queue (reported / auto-flagged chats and enquiries, audit log), earnings report (commission, advances), dashboard + charts, users (view / edit / suspend / delete), vendors (add / edit / delete / approve / reject / verify / suspend / feature), approvals queue, categories, locations, bookings, enquiries, review moderation, reports, **homepage CMS** (hero, trust numbers, stories, testimonials, video tiles, offers, banners, featured vendors, Google rating), contact inbox, notifications |
| **Platform** | JWT auth + role middleware, bcrypt, Helmet, CORS, rate limiting, input validation, Mongo-injection sanitising, Multer uploads with type/size/count limits (Cloudinary-ready), notification system, 404 / unauthorized pages, loading / empty / error states, toasts, responsive layouts |

## Architecture

```
React (Vite, Router, Tailwind, Framer Motion, RHF, Recharts)
   │  Axios (JWT in Authorization header)
   ▼
Express routes → controllers → services → Mongoose models → MongoDB
```

```
knotnest/
├── client/                 React app (all .jsx)
│   └── src/ components/ pages/ layouts/ routes/ context/ hooks/ services/ utils/
│            customer/ vendor/ admin/   (dashboard pages per role)
├── server/
│   ├── config/ controllers/ middleware/ models/ routes/ services/ utils/ seed/ uploads/
│   └── server.js
├── scripts/                dev.js (orchestrator), setup-env.js
├── server/tests/           smoke.test.js (npm test)
├── README.md  package.json
```

> Note: the React app is entirely `.jsx`. The Node server uses `.js` (ES modules), since Node cannot execute JSX.

## Quick start

**Requirements:** Node.js **18.12 or newer** (20+ recommended). A database is needed, but you do not have to set one up (see below).

```bash
cd knotnest
npm install
npm run dev
```

That is all. Then open **http://localhost:5173** (the API runs on http://localhost:5001).

What happens automatically:

1. `npm install` installs the root, `server/` and `client/` dependencies and creates `server/.env` from `server/.env.example`, with a **randomly generated `JWT_SECRET`** (no secret is shipped in the ZIP).
2. `npm run dev` starts the API first, **waits until it answers**, then starts the website. No more proxy `ECONNREFUSED` errors while things boot. The Vite proxy follows the `PORT` in `server/.env`.
3. The API connects to MongoDB (see next section) and, if the database is empty, loads the demo data.

Stop with `Ctrl+C`.

### Database: three ways, pick whichever you like

| Option | Setup |
|---|---|
| **Your own MongoDB** (recommended) | Install [MongoDB Community](https://www.mongodb.com/try/download/community) and start it. The default `MONGO_URI=mongodb://127.0.0.1:27017/knotnest` just works. |
| **MongoDB Atlas** (free cloud) | Create a free cluster, allow your IP, and put the connection string in `server/.env` as `MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/knotnest`. |
| **Embedded dev database** (zero setup) | If no MongoDB is reachable, in development the server starts an embedded MongoDB automatically and stores its files in `server/.data/`. The **first run downloads the MongoDB binary (~100 MB), so it needs internet and takes a minute**. Never used in production. Force it with `USE_MEMORY_DB=true`, disable it with `USE_MEMORY_DB=false`. |

### Scripts (run from the project root)

| Command | What it does |
|---|---|
| `npm run dev` | API + website together (waits for the API) |
| `npm run server` / `npm run client` | Run only one side |
| `npm run seed` | Wipe and reload the demo data (stop the dev server first if you use the embedded database) |
| `npm test` | API smoke test: 169 checks across public, customer, vendor and admin endpoints, including booking rules, payments, RSVP and safety (run while the API is up) |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | API only. With `NODE_ENV=production` it also serves `client/dist` |
| `npm run setup` | Re-create `server/.env` if you deleted it |

### Troubleshooting

- **`Port 5001 is already in use`**: change `PORT` in `server/.env`. The client proxy follows it automatically.
- **`No database available`**: start a local MongoDB, set an Atlas `MONGO_URI`, or allow the embedded database to download (needs internet once).
- **Demo data missing / want a clean slate**: stop the server and run `npm run seed`.
- **Logged out after restart**: only happens if `server/.env` was deleted (a temporary secret is then used). Run `npm run setup`.

## Environment variables

The server reads `server/.env` (created for you; every variable is documented in `server/.env.example`).

| Variable | Purpose |
|---|---|
| `PORT` | API port, default `5001` (5000 is avoided because macOS uses it for AirPlay) |
| `MONGO_URI` | MongoDB connection string |
| `USE_MEMORY_DB` | `auto` (default), `true` or `false`: embedded dev database behaviour |
| `AUTO_SEED` | `true` (default): load demo data into an empty database in development |
| `JWT_SECRET` | Token signing secret. Generated by setup; **required in production** |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated (any `localhost` origin is also allowed in development) |
| `NODE_ENV` | `development` or `production` |
| `RATE_LIMIT_MAX` | Requests per IP per 15 min on `/api` (default 100000 dev / 3000 prod) |
| `STORAGE_PROVIDER` | `local` (default) or `cloudinary` |
| `MAX_FILE_SIZE_MB` | Upload size limit, default `5` |
| `CLOUDINARY_*` | Only for `cloudinary` (the package is installed automatically as an optional dependency) |
| `PUBLIC_APP_URL` | Website address used in RSVP links in emails (defaults to the first `CLIENT_URL`) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_SECURE` | SMTP server for invitations. Empty in development = test inbox / local outbox |
| `MAIL_FROM` | Sender shown to guests (must be verified with your SMTP provider) |
| `MAIL_MODE` | `auto` (default), `smtp`, `ethereal` or `outbox` |
| `RAZORPAY_KEY_ID` `RAZORPAY_KEY_SECRET` | Razorpay **test** keys. Empty in development = simulated payments |
| `ADVANCE_PERCENT` / `COMMISSION_PERCENT` | Advance paid to lock a date (default 10) and platform commission (default 8), % of booking value |

Client (`client/.env`, optional): `VITE_API_URL`, `VITE_API_ORIGIN`, `VITE_PROXY_TARGET`; normally leave them empty.

**Production:** set `NODE_ENV=production`, a strong `JWT_SECRET`, a real `MONGO_URI` and `CLIENT_URL`; run `npm run build` then `npm start`. The server refuses to start in production without `JWT_SECRET`, and never falls back to the embedded database.

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@knotnest.com | Admin@123 |
| Customer | user@knotnest.com | User@123 |
| Vendor | vendor@knotnest.com | Vendor@123 |

Seed data: 29 users, 18 categories, 12 cities, 20 vendors (19 approved + 1 pending), 10 reviews, 16 bookings, 12 enquiries, a demo wedding ("Diya & Aarav") with 5 events, a linked palace venue, 8 guests with mixed RSVPs, checklist/expenses, sample chats (one reported, for the admin Safety queue), paid advances for the earnings report, and full homepage content.

### Demo walkthrough (5 minutes)

1. **Customer** (`user@knotnest.com`): *My Wedding* shows the 5 events; the Wedding event takes its venue from the confirmed Rajmahal Palace booking. *Guests & RSVP*: counts per event, **Preview invitation**, add a guest with your own email, **Send**. In development, click **Open sent email** next to the guest to see the invitation.
2. Copy that guest's RSVP link (copy icon), open it in a private window: no login. Answer per event and submit. The Guests page updates the headcount and the couple gets a notification.
3. *Bookings*: **Pay advance** on the confirmed palace booking (simulated without Razorpay keys).
4. **Managed booking:** log in as **admin** → *Booking reviews*: approve Ananya's request, and send Vihaan's accepted offer to the couple. As **vendor**, accept the Demo Customer's Studio Kesar request with a message; back as admin, forward it; as the **customer**, *Bookings* shows "Ready to confirm" with the full timeline. Confirm, then pay the advance. Try switching *Booking approval* to Automatic.
5. *Messages*: chat with Studio Kesar Photography. Log in as **vendor** (`vendor@knotnest.com`) to reply; try sending a phone number to see the safety note.
6. **Admin** (`admin@knotnest.com`): *Safety* has a reported scam chat. Open it (a reason is required), read the flagged UPI ID and phone number, resolve it, then check the *Audit log* tab. *Reports* shows commission and advances.
Other vendor logins: `owner1@knotnest.com` … `owner19@knotnest.com` / `Vendor@123`.

## API reference

All routes are under `/api`. 🔒 = needs `Authorization: Bearer <token>`.

**Auth** — `POST /auth/register` · `POST /auth/login` · `GET /auth/me` 🔒 · `PUT /auth/me` 🔒 · `PUT /auth/password` 🔒 · `POST /auth/logout`

**Vendors** — `GET /vendors` · `GET /vendors/compare?ids=a,b` · `GET /vendors/:id` · `POST /vendors` (admin) · `PUT /vendors/:id` (owner/admin) · `DELETE /vendors/:id` (admin) · `GET /vendors/me/profile` (vendor) · `GET /vendors/me/analytics` (vendor)

Search examples (filters combine, paginated with `page` & `limit`):
```
GET /api/vendors?search=photographer
GET /api/vendors?city=Mumbai
GET /api/vendors?category=photographers        (slug, id or name)
GET /api/vendors?minPrice=20000&maxPrice=100000
GET /api/vendors?rating=4&verified=true&available=2027-02-14&sort=price_asc
```
`sort`: `popular` · `rating` · `price_asc` · `price_desc` · `newest`

**Categories / Locations** — `GET` public · `POST` `PUT /:id` `DELETE /:id` (admin)

**Enquiries** — `POST /enquiries` (customer) · `GET /enquiries` (scoped to role) · `PUT /enquiries/:id` (vendor/admin)

**Bookings** — `POST /bookings` (customer) · `GET /bookings` (scoped; vendors never see requests under review) · `PUT /bookings/:id` `{status, note, amount?}` — managed flow `pending_review → requested → vendor_accepted|vendor_declined → awaiting_customer → confirmed → completed` (or `cancelled`); each role may only make its own moves, and vendor acceptance holds the date atomically

**Reviews** — `POST /reviews` (completed booking only, one per booking) · `GET /reviews/vendor/:vendorId` · `GET /reviews` (scoped) · `PUT /reviews/:id` (admin moderate) · `DELETE /reviews/:id` (admin) · `PUT /reviews/:id/reply|report` (vendor)

**Wedding (customer)** — `GET/POST/PUT /wedding` · `GET /wedding/summary` · `POST /wedding/checklist` · `PUT|DELETE /wedding/checklist/:taskId` · `GET /wedding/traditions` · `POST /wedding/events/plan` (preview, saves nothing) · `POST /wedding/events/apply` `{events}` · `PUT /wedding` `{weddingDate, shiftEvents: true}` · `POST /wedding/events` · `PUT|DELETE /wedding/events/:eventId`

**Guests & invitations (customer)** — `GET|POST /wedding/guests` · `POST /wedding/guests/import` · `PUT|DELETE /wedding/guests/:id` · `POST /wedding/invites/send` `{guestIds?}` · `POST /wedding/invites/remind` · `GET /wedding/invites/preview?guest=`

**RSVP (public, no login)** — `GET /rsvp/:token` · `POST /rsvp/:token` `{responses: [{event, status, headcount}], foodPreference, guestNote}`

**Payments (customer)** — `GET /payments/config` · `POST /payments/order` `{booking}` · `POST /payments/verify` `{orderId, paymentId, signature}`

**Messages (customer/vendor)** — `GET /conversations` · `POST /conversations` `{vendor}` · `GET /conversations/:id/messages?after=` · `POST /conversations/:id/messages` · `POST /conversations/:id/report` · `POST /enquiries/:id/report`

**Expenses (customer)** — `GET/POST /expenses` · `PUT|DELETE /expenses/:id`

**Favourites (customer)** — `GET /favourites` · `POST /favourites/:vendorId` (toggle)

**Notifications** — `GET /notifications` · `PUT /notifications/:id/read` · `PUT /notifications/read-all` · `DELETE /notifications/:id`

**Uploads** — `POST /uploads/:kind` (`vendor|portfolio|category|review|profile|content`, multipart field `files`, JPG/PNG/WEBP, ≤5 MB)

**Content** — `GET /content/home` · `POST /contact`

**Admin (admin only)** — `GET /admin/dashboard` · `GET /admin/reports` · `GET|PUT|DELETE /admin/users[/:id]` · `GET /admin/vendors` · `PUT /admin/vendors/:id/moderate` `{action: approve|reject|suspend|verify|unverify|feature|unfeature}` · `GET /admin/bookings` · `GET /admin/enquiries` · `GET|PUT /admin/content` · `GET|DELETE /admin/messages` · `GET /admin/safety?filter=reported|flagged|resolved` · `POST /admin/safety/conversations/:id/open` `{reason}` · `PUT /admin/safety/conversations/:id/resolve` · `POST /admin/safety/enquiries/:id/open` · `PUT /admin/safety/enquiries/:id/resolve` · `GET /admin/audit` · `GET /admin/booking-reviews` · `GET|PUT /admin/settings/platform` `{bookingApproval: 'manual'|'auto_verified', reviewHours}`

## Security notes
Passwords hashed with bcrypt (12 rounds) and never returned; role checked server-side on every protected route; request bodies validated and mass-assignment prevented with field whitelists; `express-mongo-sanitize` strips `$`/`.` operators; Helmet + CSP; rate limits on `/api` and stricter on login/register/contact; uploads are type- and size-checked and stored under random filenames. Change `JWT_SECRET` before deploying.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)**: one Render service (API + website, simplest), or Vercel (website) + Render (API), with MongoDB Atlas, Cloudinary, SMTP and Razorpay.

## Known limitations / future improvements
- **Payments**: Razorpay is wired for **test mode**; going live needs a verified Razorpay account, a webhook for payments completed after the browser closes, and refunds for cancelled bookings (currently handled outside the app).
- **Email**: invitations are emailed; booking notifications are still in-app only. Bounces are not tracked automatically (a failed send is shown per guest). WhatsApp invitations open WhatsApp with a ready message; there is no WhatsApp Business API integration.
- **Chat** uses polling every few seconds, not WebSockets. Fine for this scale; use Socket.IO for many concurrent users.
- Password reset, OTP login and refresh tokens (JWT is stored in `localStorage`; use httpOnly cookies for stricter setups).
- Guest personal data is deleted with the couple's account; an automatic clean-up some months after the wedding would be a good addition.
- Vendor images in the seed reuse the prototype's stock photos; the hero video file (`hero video URL`) is set from Admin → Homepage. Replace stock imagery with licensed photography before launch.
- `npm test` is an API smoke test; there is no unit-test suite or browser test suite yet.
- Razorpay order creation and real SMTP delivery were written to the providers' documented APIs but tested here only in simulated / test-inbox mode. Try them once with your own test keys and SMTP account.
- Two low-severity-in-practice `npm audit` notes remain on the client and need breaking major upgrades: Tailwind 3's build-time glob dependency (fix = Tailwind 4) and React Router 6 (fix = Router 7, which needs Node 20+). Neither is reachable in this app (no SSR, no untrusted glob input).
