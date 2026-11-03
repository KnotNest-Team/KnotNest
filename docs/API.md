# KnotNest API reference

This reference is written from the source code: [server/routes/index.js](../server/routes/index.js), the controllers in [server/controllers/](../server/controllers/), and the middleware in [server/middleware/](../server/middleware/). When the code and this page disagree, the code is right. Please update this page in the same change.

Request and response bodies marked **Example** are illustrations put together by reading the code. They were not captured from a running server, so IDs, dates and amounts are made up.

- [Conventions](#conventions)
- [Auth](#auth) · [Vendors](#vendors) · [Categories and locations](#categories-and-locations) · [Enquiries](#enquiries)
- [Bookings](#bookings) · [Payments](#payments) · [Reviews](#reviews)
- [Wedding planner](#wedding-planner) · [Guests and invitations](#guests-and-invitations) · [Public RSVP](#public-rsvp)
- [Expenses](#expenses) · [Favourites](#favourites) · [Messages](#messages) · [Notifications](#notifications)
- [Uploads](#uploads) · [Public content](#public-content) · [Admin](#admin) · [Development-only routes](#development-only-routes)

---

## Conventions

### Base URL

All routes are under `/api`. In development the API listens on `PORT` from `server/.env` (default `5001`), and Vite proxies `/api` and `/uploads` from `http://localhost:5173` to it ([client/vite.config.js](../client/vite.config.js)).

```
http://localhost:5001/api/...        direct
http://localhost:5173/api/...        through the Vite dev proxy
```

In production the same Express process serves the API and the built React app from one origin.

### Authentication

- Sign in with `POST /api/auth/login` or `POST /api/auth/register`. Both return `{ token, user }`.
- Send the token on later requests as `Authorization: Bearer <token>`.
- The token is a JWT signed with `JWT_SECRET`, containing `{ id }`, and it expires after `JWT_EXPIRES_IN` (default `7d`).
- Logging out does nothing on the server (`POST /auth/logout` only replies). The client throws the token away.
- On every authenticated request the user is loaded from the database, so deleted or suspended accounts are refused straight away, even while their token is still valid.

The **Auth** column in the tables below uses these values:

| Value | Middleware | Behaviour |
|---|---|---|
| `public` | none | No token needed. |
| `optional` | `optionalAuth` | A valid token sets `req.user`. A missing or invalid token is ignored, and the request goes on as anonymous. |
| `any` | `authMiddleware` | Any signed-in role. |
| `customer` / `vendor` / `admin` | `authMiddleware` + role check | Only that role. Other roles get `403`. |
| `customer,vendor` etc. | `roles(...)` | Any of the roles listed. |

Some routes check ownership as well as role. For example, a vendor can only update their own bookings. Those checks are listed per route.

### Errors

Every error has the same JSON shape ([server/middleware/error.js](../server/middleware/error.js)):

```json
{ "message": "Validation failed", "details": { "email": "Invalid email" } }
```

`details` only appears when there is something to put in it. When `NODE_ENV=development`, errors with status `500` or above also include a `stack`.

| Status | When |
|---|---|
| `400` | The request failed body validation (`Validation failed` with per-field `details`), a business rule was broken, Mongoose validation failed, an ID was malformed (`CastError` → `Invalid <field>`), or an upload was rejected. |
| `401` | No token: `Not authenticated`. Invalid or expired token: `Session expired, please log in again`. User deleted: `Account no longer exists`. Wrong login: `Invalid email or password`. |
| `403` | Wrong role or not the owner: `You do not have permission to do this`. Suspended account: `Your account has been suspended`. |
| `404` | Record not found, or an unknown `/api` route: `Route not found: GET /api/...`. |
| `409` | Duplicate unique value (`That <field> is already in use`), a booking or calendar conflict, or a price that changed since the quote. |
| `429` | Rate limit hit (see below). |
| `502` / `503` | A payment provider failed, or a feature is not configured (payments in production without keys, email in production without SMTP). |

### Body validation

Routes marked with **Validated** run `validate(...)` from [server/utils/validate.js](../server/utils/validate.js) before the controller. Its rules:

- `required`: the field must not be `undefined`, `null` or `''`. Fields that are not required and are empty are skipped.
- `string` / `email`: must be a JS string. It is trimmed in place, then `minLength`, `maxLength` and the email pattern are checked.
- `number`: anything `Number()` accepts. It is converted to a number in place, then `min` and `max` are checked.
- `date`: anything `Date.parse` accepts.
- `array`: must be a JSON array.
- `oneOf`: the value must be one of the listed values.

All rule failures for a request are collected into one `400` response.

Fields that are not listed are not rejected. Each controller copies only the fields it allows (using `pick`), so extra or protected fields such as `role`, `status` or `amount` are ignored unless the route lists them. `express-mongo-sanitize` also removes `$` and `.` keys from bodies, so `{ "email": { "$gt": "" } }` fails validation instead of reaching MongoDB.

### Pagination

List routes that page their results take `?page=` (default 1) and `?limit=` (capped at 100; each route has its own default). They return:

```json
{ "<items>": [...], "total": 42, "page": 1, "pages": 3 }
```

### Rate limits

| Scope | Window | Production | Development |
|---|---|---|---|
| All `/api` | 15 min | 3000, or `RATE_LIMIT_MAX` | 100000, or `RATE_LIMIT_MAX` |
| `POST /auth/register`, `POST /auth/login` | 15 min | 30 | 1000 |
| `POST /wedding/invites/send`, `/remind` | 1 h | 20 | 1000 |
| `GET` / `POST /rsvp/:token` | 15 min | 60 | 1000 |
| `POST /conversations/:id/messages` | 1 min | 30 | 1000 |
| `POST /contact` | 1 h | 10 | 1000 |

### Money and dates

- Amounts are whole Indian rupees (integers). Razorpay amounts in paise appear only as `amountPaise`.
- Booking days are calendar dates `YYYY-MM-DD`, stored as UTC midnight.
- Event start and end times are minutes after midnight (`600` = 10:00 AM, `1440` = midnight).

---

## Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create a customer or vendor account. |
| POST | `/auth/login` | public | Exchange email and password for a token. |
| GET | `/auth/me` | any | The current user. |
| PUT | `/auth/me` | any | Update your own name, phone or profile image. |
| PUT | `/auth/password` | any | Change your password. |
| POST | `/auth/logout` | public | Always replies `{ message: 'Logged out' }`. |

### POST /auth/register

**Validated:** `name` (required, 2-80), `email` (required, email), `password` (required, 6-100), `phone` (max 20).

| Field | Notes |
|---|---|
| `role` | `customer` (default) or `vendor`. Any other value returns `400 Role must be customer or vendor`. You cannot register as `admin`. |
| `businessName`, `category` | Required when `role=vendor`. `category` must be an existing category ID. |
| `city` | Optional, vendors only. |

A vendor registration also creates a `Vendor` profile with `status: 'pending'` and notifies the admins. The profile is not public until an admin approves it.

**Responses:** `201 { token, user }`. For vendors, `user.vendor` is `{ _id, status, businessName }`.
**Errors:** `409 An account with this email already exists`. `400 Business name and category are required for vendors`. `400 Invalid category` (the new user is removed again).

**Example request**

```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "secret123", "role": "vendor", "businessName": "Asha Clicks", "category": "665f0c...", "city": "Pune" }
```

### POST /auth/login

**Validated:** `email` (required, email), `password` (required).

**Responses:** `200 { token, user }`. **Errors:** `401 Invalid email or password`. `403 Your account has been suspended. Contact support.`

### PUT /auth/me

Only `name`, `phone` and `profileImage` are applied. **Validated:** `name` (2-80 when sent). **Response:** `{ user }`.

### PUT /auth/password

**Validated:** `currentPassword` (required), `newPassword` (required, min 6).
**Response:** `{ message: 'Password updated' }`. **Errors:** `400 Current password is incorrect`.

---

## Vendors

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/vendors` | public | Search the marketplace (approved vendors only). |
| GET | `/vendors/compare?ids=a,b,c` | public | Up to 4 approved vendors, for side-by-side comparison. |
| GET | `/vendors/me/profile` | vendor | The signed-in vendor's own profile. |
| GET | `/vendors/me/analytics` | vendor | Views, enquiries and bookings for the dashboard. |
| GET | `/vendors/:id` | optional | One vendor with up to 20 published reviews. |
| POST | `/vendors` | admin | Create a vendor (approved straight away). |
| PUT | `/vendors/:id` | vendor, admin | Update a profile (vendors only their own). |
| DELETE | `/vendors/:id` | admin | Delete a vendor. |

### GET /vendors

Query parameters (all optional; any combination works):

| Param | Effect |
|---|---|
| `search` | Case-insensitive match on business name, description, city, location, service names, or category name. |
| `category` | A category ID, slug, or the start of a category name (`Photo` matches `Photography`). |
| `city` | Exact city, case-insensitive. |
| `minPrice`, `maxPrice` | Range on `startingPrice`. |
| `rating` | Minimum average rating. |
| `verified=true`, `featured=true` | Flags. |
| `available=YYYY-MM-DD` | Leaves out vendors that blocked this whole date. Time-slot bookings are not checked here. |
| `sort` | `popular` (default), `rating`, `price_asc`, `price_desc`, `newest`. |
| `page`, `limit` | Default limit 9. |

**Response:** `{ vendors, total, page, pages }`. The internal calendar fields `bookedSlots`, `slotVersion` and `viewsLog` are never included.

### GET /vendors/:id

- Vendors that are not approved return `404 Vendor not found`, except to their owner or an admin.
- Views by visitors who are not the owner or an admin are counted (`views` and a daily log).
- For visitors who are not the owner or an admin, `bookedSlots` is reduced to `{ date, start, end }`, so the public calendar shows when the vendor is busy but not which booking holds the time.

**Response:** `{ vendor, reviews }`.

### PUT /vendors/:id and POST /vendors

Fields a vendor can set on their own profile: `businessName, ownerName, email, phone, category, description, location, city, state, address, startingPrice, images, logo, services, packages, unavailableDates, socialLinks, eventPricing, eventsOffered, fullDay`.

Admins can also set `verified, featured, status, owner`. `POST /vendors` is **Validated**: `businessName` and `category` are required.

The server cleans these fields before saving:

- `eventPricing` must be a list. Each entry becomes `{ eventName (trimmed, max 60), price (rounded, ≥ 0) }`. Entries that are invalid, or whose name repeats one already seen (ignoring case), are dropped.
- `eventsOffered` is trimmed to at most 40 names. An empty list means the vendor offers every event.
- `fullDay` becomes `{ enabled (true unless false is sent), price (whole rupees, ≥ 0) }`.

**Errors:** `400 Invalid category`. `400 eventPricing must be a list`. `403` when a vendor edits someone else's profile. `404 Vendor not found`.

**Example request (vendor sets event prices)**

```json
{ "eventPricing": [{ "eventName": "Haldi", "price": 15000 }, { "eventName": "Sangeet", "price": 30000 }], "fullDay": { "enabled": true, "price": 52000 } }
```

---

## Categories and locations

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/categories` | optional | Active categories, each with `vendorCount` (approved vendors). Admins can add `?all=true` to include inactive ones. |
| POST | `/categories` | admin | **Validated:** `name` required. Also takes `description, image, status`. |
| PUT | `/categories/:id` | admin | Same fields. |
| DELETE | `/categories/:id` | admin | `409 Category has vendors. Deactivate it instead of deleting.` |
| GET | `/locations` | optional | Active locations sorted by city. Admins can add `?all=true`. |
| POST | `/locations` | admin | **Validated:** `city` required. Also takes `state, image, status`. |
| PUT | `/locations/:id` | admin | Same fields. |
| DELETE | `/locations/:id` | admin | `404` if missing. |

`status` is `active` or `inactive`. Responses use the keys `{ categories }`, `{ category }`, `{ locations }` and `{ location }`.

---

## Enquiries

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/enquiries` | customer | Send an enquiry to an approved vendor. |
| GET | `/enquiries` | any | Customers see their own, vendors see enquiries to their business, admins see all. `?status=`, default limit 20. |
| PUT | `/enquiries/:id` | vendor, admin | Set `status` and optionally `response`. Vendors only on their own enquiries. |
| POST | `/enquiries/:id/report` | customer, vendor | Report the thread to KnotNest (participants only). |

**POST /enquiries. Validated:** `vendor`, `name`, `email`, `phone` (7-20) and `message` (5-2000) are required. `weddingDate` (date) and `guestCount` (≥ 0) are optional. `eventType` is accepted as well.
Response: `201 { enquiry }`. Both the vendor and the customer are notified.

**PUT /enquiries/:id:** `status` must be one of `pending, contacted, accepted, rejected, converted`, otherwise `400 Invalid status`. The customer is notified.

**POST /enquiries/:id/report:** `reason` of at least 5 characters (`400` otherwise). After a report, an admin can read the enquiry text from [Safety](#admin). Response: `{ message }`.

---

## Bookings

Bookings go through a review flow. The server decides every price. Any amount sent by the browser is ignored, except a vendor or admin price adjustment on `PUT /bookings/:id`.

### Day selection format

Wherever a request takes `days`, each entry is one of these:

```jsonc
{ "date": "2030-02-14", "mode": "full_day" }                          // every event that day the vendor covers
{ "date": "2030-02-14", "mode": "events", "events": ["<eventId>"] }    // chosen events from the couple's wedding plan
{ "date": "2030-02-14", "packageName": "Gold", "event": "<eventId>" }  // whole date (older form; packageName/event optional)
```

Rules ([server/services/bookingService.js](../server/services/bookingService.js) `resolveDays`):

- 1 to 10 days per vendor. Dates must be today or later.
- The same date sent as `full_day` and as `events` becomes a single full day, so events are never charged twice. Two `events` entries for the same date are merged. Any other repeat returns `400 <date> is listed twice`.
- `full_day` and `events` need events on that date in the couple's wedding plan (`/wedding/events`).
- `full_day` is refused when the admin turned full-day packages off, or the vendor did (`fullDay.enabled: false`).
- A date in the vendor's `unavailableDates` returns `409`.
- Each event is priced from the vendor's listing. A chosen package wins, then an exact event-name price, then a partial name match, then `startingPrice`.
- When every eligible event of a day (two or more) is picked one by one, and the full-day package would be cheaper, the server prices it as the full day and adds an explanation to `notes`.

Discount rules (full-day, multi-event, multi-day, returning couple, stacking, cap) are described at the top of [server/services/pricingEngine.js](../server/services/pricingEngine.js) and tested in `server/tests/pricing.*.test.js`.

### Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/bookings/plan` | customer | The couple's upcoming wedding days and events, what is already booked for each, the discount settings, and `priorBookings`. |
| POST | `/bookings/quote` | customer | Live price for a selection. Nothing is saved. |
| POST | `/bookings/available-vendors` | customer | Vendors in a category who can take a selection, each with its own price. |
| POST | `/bookings/checkout` | customer | Book several vendors at once (one booking per vendor). |
| POST | `/bookings` | customer | Book one vendor. |
| GET | `/bookings` | any | Bookings visible to the caller. |
| PUT | `/bookings/:id` | any | Move a booking to its next status. |
| GET | `/admin/booking-reviews` | admin | The admin review queue (see [Admin](#admin)). |

### POST /bookings/quote

The body is either `{ items: [{ vendor, days, notes? }] }` or, for one vendor, `{ vendor, days }`. The older form `{ vendor, weddingDate, event?, packageName? }` also works.

Unlike checkout, an invalid selection for one vendor does not fail the whole request. That item comes back with `error` set.

**Response**

```jsonc
{
  "items": [{ "vendor": { "_id", "businessName", "city", "images", "verified", "rating", "startingPrice", "fullDay" },
              "error": null, "issues": [], "notes": [], "bookingType": "full_day",
              "days": [{ "date", "mode", "events", "subtotal", "packagePrice", "amount", "discount", "packageName", "eventName" }],
              "pricing": { "subtotal", "packageSavings", "eligibleSubtotal", "discounts": [...], "totalDiscount", "capped", "maxPercent", "stacking", "final", "priorBookings", "version": 2 } }],
  "totals": { "subtotal", "packageSavings", "discount", "final", "vendors", "days", "events" },
  "priorBookings": 0, "rules": { /* Setting.discounts */ }, "fullDayPackages": true
}
```

`issues` lists calendar conflicts and duplicate open bookings with the same vendor on the same day. Each issue is `{ type: 'unavailable' | 'duplicate' | 'invalid', message }`.

**Example: one vendor, one full day** (illustrative, default discount rules)

```json
{ "vendor": "665f0c0000000000000000a1", "days": [{ "date": "2030-02-14", "mode": "full_day" }] }
```

If the vendor charges 15,000, 20,000 and 30,000 for that day's three events, the default rules give `subtotal 65000`, one `full_day` discount of `9750` (15%), and `final 55250`.

### POST /bookings/available-vendors

**Validated:** `category` (required: an ID or the exact name) and `days` (required array). Optional: `city` (exact, case-insensitive) and `checkoutDays` (counts toward the multi-day discount).

Up to 40 approved vendors in that category, featured first. Each comes back as `{ vendor, available, issues, pricing, days }`, with available vendors first and then sorted by price. A vendor whose selection is invalid comes back with `available: false` and the error in `issues`.

**Errors:** `400 Choose a category`.

### POST /bookings/checkout and POST /bookings

**Checkout. Validated:** `items` (required array). Optional: `expectedTotal` (number ≥ 0) and `notes`.
**Single vendor. Validated:** `vendor` (required). Optional: `weddingDate`, `expectedTotal`, `days`, `notes`, `event`, `packageName`.

- Up to 12 vendors, each listed once (`400` otherwise).
- Each customer's checkouts run one at a time on the server, so a double click cannot create two sets of bookings.
- Any `issues` → `409` with the first message, and `details.issues` listing all of them.
- If `expectedTotal` is sent and no longer matches the server's total → `409 The price changed to ₹... since your quote`, with `details.quote` holding the new quote. The client should show the new price and ask again.
- New bookings start as `pending_review` (admin review). When the admin setting `bookingApproval` is `auto_verified` and the vendor is verified, they start as `requested` (straight to the vendor).
- Bookings from one multi-vendor checkout share a `checkout` ID (`co_...`).

**Responses:** checkout `201 { bookings, totals, checkout }`. Single vendor `201 { booking }`.

### GET /bookings

`?status=`, `?page=`, `?limit=` (default 20). Customers see their own bookings and vendors see their business's. Vendors never see `pending_review` bookings (not yet sent to them), or that step in `history`. Each side only sees the admin note meant for them: `adminNote` goes to the couple and `adminNoteVendor` to the vendor.

### PUT /bookings/:id

**Validated:** `status` required. Optional: `note` (max 1000) and `amount`.

Allowed transitions (anything else → `400 Cannot change a <from> booking to <to>`):

| From | Admin | Vendor | Customer |
|---|---|---|---|
| `pending_review` | `requested`, `cancelled` | – | `cancelled` |
| `requested` | `cancelled` | `vendor_accepted`, `vendor_declined` | `cancelled` |
| `vendor_accepted` | `awaiting_customer`, `cancelled` | `cancelled` | `cancelled` |
| `vendor_declined` | `cancelled` | – | `cancelled` |
| `awaiting_customer` | `cancelled` | `cancelled` | `confirmed`, `cancelled` |
| `confirmed` | `completed`, `cancelled` | `completed`, `cancelled` | `cancelled` |
| `cancelled` | `pending_review` | – | – |

Side effects and extra checks:

- Customers can only change their own bookings, and vendors only their business's (`403`).
- **Moving to `vendor_accepted`** puts the vendor's calendar hold on every day or time slot of the booking, all at once or not at all. If any part clashes: `409 ... already blocked in the calendar: <dates>. Unblock ... first.`
- **Cancelling** from `vendor_accepted`, `awaiting_customer` or `confirmed` releases those holds.
- **Customer confirming** first checks that the vendor is still approved and still holds every day and slot. If not: `409 <vendor> is no longer available for this booking...`.
- **Marking `completed`** is refused before the booking's last day, except for admins.
- **An admin rejecting** a `pending_review` booking needs a `note` of at least 5 characters.
- **`amount`:** a vendor can set it when accepting, and an admin while the booking is `pending_review` or `vendor_accepted`. Every change is recorded in `pricing.adjustments`. In auto mode, a verified vendor's acceptance or decline goes straight to the couple, unless the vendor changed the price.
- When the couple confirms, `pricing.confirmedAt` is set. Later rule or price changes never change a confirmed booking.

**Response:** `{ booking }`.

**Example: vendor accepts with a new price**

```json
{ "status": "vendor_accepted", "amount": 50000, "note": "Includes drone coverage" }
```

---

## Payments

The couple pays an advance once a booking is `confirmed`. With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set, the mode is `razorpay`. Without them, development uses a clearly labelled simulated `demo` mode, and production is `off`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/payments/config` | any | `{ mode: 'razorpay'|'demo'|'off', keyId, advancePercent }`. |
| POST | `/payments/order` | customer | **Validated:** `booking` required. Creates an order for `ADVANCE_PERCENT` (default 10%) of the booking amount. |
| POST | `/payments/verify` | customer | **Validated:** `orderId` required. Also `paymentId` and `signature`. Records the advance. |

- **Order errors:** `404` (no booking), `403` (not your booking), `400` (not confirmed yet, or amount 0), `409` (advance already paid), `503` (payments are off), `502` (Razorpay could not be reached or refused the order).
- **Order response (`201`):** `{ mode, keyId, orderId, amount, amountPaise, currency: 'INR', name, description, prefill }`.
- **Verify:** in `razorpay` mode, `signature` must equal `HMAC_SHA256(orderId|paymentId, secret)`. Otherwise the payment is marked `failed` and the response is `400`. In production, demo payments are refused.
- **Verify response:** `{ booking, payment }`. `booking.advancePaid` is now `true`, and `payment.commission` is `COMMISSION_PERCENT` (default 8%) of the booking amount. A second verify returns `409`.

---

## Reviews

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reviews/vendor/:vendorId` | public | A vendor's published reviews. Default limit 10. |
| GET | `/reviews` | any | Customers see their own, vendors their business's, admins all. `?status=published|hidden`, `?reported=true`. Default limit 20. |
| POST | `/reviews` | customer | **Validated:** `booking` (required), `rating` (1-5), `comment` (3-2000). Optional `images`. |
| PUT | `/reviews/:id/reply` | vendor | `{ reply }` (max 1000), on reviews of your own business only. |
| PUT | `/reviews/:id/report` | vendor | Flag a review for admin moderation. |
| PUT | `/reviews/:id` | admin | `{ status: 'published' | 'hidden' }`. Also clears the reported flag. |
| DELETE | `/reviews/:id` | admin | Delete a review. |

You can only review a **completed** booking of your own (`400` / `404` otherwise), and only once per booking (`409`). Creating, moderating or deleting a review recalculates the vendor's rating.

---

## Wedding planner

All of these routes are **customer** only. Most return `404 Create your wedding profile first` until `POST /wedding` has been called.

| Method | Path | Purpose |
|---|---|---|
| GET | `/wedding/summary` | Dashboard numbers: booked vendors, pending enquiries, amount spent, checklist progress, upcoming bookings, events, RSVP totals. |
| GET | `/wedding` | `{ wedding, events }`. `wedding` is `null` before the profile exists. |
| POST | `/wedding` | Create the profile. `409` if it already exists. |
| PUT | `/wedding` | Update the profile. |
| GET | `/wedding/traditions` | The wedding traditions you can choose for `culture` and `partnerCulture`. |
| POST | `/wedding/events/plan` | Preview suggested events for a tradition and date. Nothing is saved. |
| POST | `/wedding/events/apply` | Save the chosen suggested events. |
| POST | `/wedding/events` | Add an event. |
| PUT | `/wedding/events/:eventId` | Edit an event. |
| DELETE | `/wedding/events/:eventId` | Remove an event. |
| POST | `/wedding/checklist` | Add a task `{ title, dueDate? }`. |
| PUT | `/wedding/checklist/:taskId` | Update `{ title?, dueDate?, done? }`. |
| DELETE | `/wedding/checklist/:taskId` | Remove a task. |

**Profile fields** (POST and PUT): `partnerName, weddingDate, location, guestCount, budget, weddingStyle, inviteMessage, coupleNames, culture, partnerCulture, muhurat, inviteTheme`.

- **Validated:** `guestCount` ≥ 0, `budget` ≥ 0, `weddingDate` a date.
- `culture` and `partnerCulture` must come from `/wedding/traditions`, and `muhurat` must look like `HH:MM` (`400` with `details`).
- Creating the profile adds the default checklist, with due dates relative to the wedding date. Once a tradition and date are set, it also adds the suggested events (`planned` = how many were added).
- `PUT` with `shiftEvents: true` and a new `weddingDate` moves every event and every open task by the same number of days. Open bookings that include moved events get an alert, and their vendor and the admins are notified. The booking's held dates are **not** changed automatically.

**Event fields:** `name, date, time, venueName, address, mapLink, dressCode, notes, meaning, hostSide`.

- **Validated** on add and edit: `name` (2-60) and `date` are required.
- `mapLink` must start with `http://` or `https://`.
- A wedding can have at most 30 events.
- New events are added to the invitations of guests already on the list, by side (`bride`, `groom`, `both`), unless `inviteGuests: false` is sent.
- Editing or deleting an event that is part of an open booking adds an alert to that booking. Deleting an event also removes it from guests' invitations.
- Event responses are `{ wedding, events }`.

**`/wedding/events/apply`:** `{ events: [{ name, date, time?, hostSide?, meaning?, tradition?, templateKey? }], inviteGuests? }`, up to 30. Events whose names already exist (ignoring case) are skipped. Response: `201 { wedding, events, added }`.

---

## Guests and invitations

All of these routes are **customer** only.

| Method | Path | Purpose |
|---|---|---|
| GET | `/wedding/guests` | `{ guests, events, summary, mail, couple }`. Before a wedding profile exists: `{ needsWedding: true, guests: [], events: [] }`. |
| POST | `/wedding/guests` | Add one guest. |
| POST | `/wedding/guests/import` | Add up to 500 guests `{ guests: [...], events? }`. Rows with problems are skipped and reported back. |
| PUT | `/wedding/guests/:id` | Update a guest (and optionally the `events` they are invited to). |
| DELETE | `/wedding/guests/:id` | Remove a guest. |
| POST | `/wedding/invites/send` | Queue invitation emails. `202 { queued }`. |
| POST | `/wedding/invites/remind` | Queue reminders to guests who still have unanswered events. `202 { queued }`. |
| GET | `/wedding/invites/preview` | `{ subject, html }` of the invitation email. `?guest=<id>` for a real guest, `?reminder=true` for the reminder. |
| GET | `/wedding/rsvp-preview` | The public RSVP page data with a sample guest. `?theme=<name>` to try another theme. |

- **Guest fields:** `name` (required, ≥ 2), `email` (valid, unique per wedding, `409` if already used), `phone`, `side` (`bride|groom|both`), `maxGuests` (1-20), `seat`, `events` (event IDs; defaults to every event).
- A guest list can have at most 1000 invitations.
- **Send:** `{ guestIds?: [...], onlyNew?: true }`. By default it goes to guests whose invitation is `not_sent` or `failed`. A guest needs an email address and at least one event. Emails are sent in the background, and `invite.status` moves through `queued` → `sent` or `failed`.
- **Errors:** `400` (no events yet, or no one to send to), `503` (email not configured; production only).
- In development without SMTP, emails go to an Ethereal test inbox or the local outbox. See [WINDOWS_DEVELOPMENT.md](WINDOWS_DEVELOPMENT.md#email-and-payments-stay-local).

---

## Public RSVP

No login is needed. The guest's unguessable token in the link is the only key.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/rsvp/:token` | public | The invitation as the guest sees it. |
| POST | `/rsvp/:token` | public | Save the guest's answers. |

- A token must be 16-64 characters from `[A-Za-z0-9_-]`. Otherwise, or when no guest has it, the response is `404 This invitation link is not valid...`.
- The response shows only this guest's name, seat and invited events, plus the couple's display name, message, location, theme and `foodOptions`. It never includes other guests or the couple's account details.
- **POST body:** `{ responses: [{ event, status: 'attending'|'declined'|'pending', headcount }], foodPreference?, guestNote? }`.
  - Events the guest is not invited to, and events that already happened, are ignored.
  - `attending` needs a `headcount` from 1 to `maxGuests`.
  - `foodPreference` must be one of `Veg, Jain, Non-veg, Vegan`, or `''`.
  - `guestNote` is cut to 500 characters.
  - Errors: `400 Please check your answers`, with per-event `details`.
  - Success returns the updated view, and the couple is notified.

**Example request**

```json
{ "responses": [{ "event": "6660aa...", "status": "attending", "headcount": 3 }], "foodPreference": "Veg", "guestNote": "Arriving by train" }
```

---

## Expenses

All of these routes are **customer** only, on the caller's own expenses.

| Method | Path | Purpose |
|---|---|---|
| GET | `/expenses` | `{ expenses, byCategory, totalBudget, totalSpent, remaining }`. |
| POST | `/expenses` | **Validated:** `category` (one of the categories below) and `amount` (≥ 0) are required. Also `description`, `date`. `201 { expense }`. |
| PUT | `/expenses/:id` | Same validation and fields. `404` if it is not yours. |
| DELETE | `/expenses/:id` | `404` if it is not yours. |

Categories: `Venue, Catering, Decoration, Photography, Makeup, Clothing, Jewellery, Invitations, Entertainment, Transportation, Miscellaneous`.

---

## Favourites

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/favourites` | customer | `{ favourites }`: your saved vendors that are currently approved. |
| POST | `/favourites/:vendorId` | customer | Toggle a vendor (adds it if absent, removes it if present). `{ favourited, ids }`. `404` if the vendor does not exist. |

---

## Messages

These are chats between a couple and a vendor. Admins cannot read them through these routes. They use [Safety](#admin), which has its own rules.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/conversations` | customer, vendor | Your conversations (up to 100) and the total `unread` count. |
| POST | `/conversations` | customer | **Validated:** `vendor` required. Opens your existing thread with an approved vendor, or creates one. `201 { conversation }`. |
| GET | `/conversations/:id/messages` | customer, vendor | Up to 500 messages. `?after=<ISO time>` returns only newer ones, for polling. Marks the thread as read for you. |
| POST | `/conversations/:id/messages` | customer, vendor | `{ text }` (1-2000 characters). `201 { message, note }`. |
| POST | `/conversations/:id/report` | customer, vendor | `{ reason }` (≥ 5 characters). Lets an admin read the thread. |

Only the two participants can open a thread (`403` otherwise). Messages are always delivered, but they are checked for phone numbers, UPI IDs, email addresses, links and abusive words ([server/services/moderationService.js](../server/services/moderationService.js)). If anything is flagged, `note` explains it to the sender. The flags themselves are never returned to participants. The other side is notified only for the first unread message in a run.

---

## Notifications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/notifications` | any | Your latest 100 notifications and `unread`. |
| PUT | `/notifications/read-all` | any | Mark them all as read. |
| PUT | `/notifications/:id/read` | any | Mark one as read. `404` if it is not yours. |
| DELETE | `/notifications/:id` | any | Delete one of yours. Always replies `{ message: 'Deleted' }`, even if nothing matched. |

---

## Uploads

`POST /uploads/:kind` (**any**, `multipart/form-data`, field name `files`).

| `kind` | Max files | Roles |
|---|---|---|
| `vendor` | 5 | vendor, admin |
| `portfolio` | 12 | vendor, admin |
| `category` | 1 | admin |
| `review` | 4 | customer |
| `profile` | 1 | customer, vendor, admin |
| `content` | 6 | admin |

- Only JPEG, PNG and WEBP are accepted. Files are limited to `MAX_FILE_SIZE_MB` (default 5) each, and 12 per request.
- **Response:** `201 { urls: [...] }`. With `STORAGE_PROVIDER=local` these are `/uploads/<kind>/<file>` paths, served by the API. With `cloudinary` they are Cloudinary URLs.
- Uploading only stores the files. To use them, put the returned URLs on a record (for example `PUT /vendors/:id { images }`).
- **Errors:** `400` (unknown kind, no files, too many, wrong type, too large), `403` (role not allowed).

---

## Public content

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/content/home` | public | Homepage sections, plus `featuredVendors` (the admin's picks, or else up to 6 featured approved vendors), `categories` and `locations`. |
| POST | `/contact` | public | **Validated:** `name` and `email` required, `message` at least 5 characters. Optional `subject`. `201 { message }`. Admins are notified. |
| GET | `/health` | public | `{ status: 'ok', time }`. Answered before the routes in `routes/index.js`. |

---

## Admin

All of these routes are **admin** only.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Platform totals and recent activity. |
| GET | `/admin/reports` | Report data for charts. |
| GET | `/admin/booking-stats` | Booking analytics (types, discounts, revenue). |
| GET | `/admin/users` | `?role=`, `?status=active|suspended`, `?search=` (name, email or phone), paged (default limit 15). |
| GET | `/admin/users/:id` | `{ user, stats: { bookings, enquiries }, wedding }`. |
| PUT | `/admin/users/:id` | `name, phone, role, isActive`. You cannot suspend or demote your own account (`400`). |
| DELETE | `/admin/users/:id` | Deletes the user and their wedding, expenses, guests and conversations. Deleting a vendor user also deletes their vendor profile. You cannot delete yourself. |
| GET | `/admin/vendors` | Same query parameters as `GET /vendors`, plus `?status=` for any status. |
| PUT | `/admin/vendors/:id/moderate` | `{ action }`: one of `approve, reject, suspend, verify, unverify, feature, unfeature`. Anything else → `400 Unknown action`. The vendor is notified on approve, reject, suspend and verify. |
| GET | `/admin/bookings` | `?status=`, `?type=` (bookingType), paged. |
| GET | `/admin/enquiries` | Who, which vendor, when and status. The message text is **left out** (`messagePrivate: true`). |
| GET | `/admin/booking-reviews` | Bookings waiting for KnotNest (`pending_review`, `vendor_accepted`, `vendor_declined`), oldest first. Each has `waitingHours`, `overdue` (compared with the `reviewHours` setting) and `checks`. For `pending_review` bookings, `checks` includes `calendarFree` and `calendarNote`. Response: `{ bookings, settings }`. |
| GET | `/admin/settings/platform` | `{ settings }`: approval mode, review hours, full-day packages, event slot hours, discount rules. |
| PUT | `/admin/settings/platform` | Update the settings. Anything not sent keeps its current value. See below. |
| GET | `/admin/content` | The homepage content document. |
| PUT | `/admin/content` | Update sections: `hero, trust, google, stories, testimonials, experiences, offers, banners, featuredVendors`. |
| GET | `/admin/messages` | The latest 100 contact-form messages. |
| DELETE | `/admin/messages/:id` | Delete a contact message. |
| GET | `/admin/safety` | `?filter=reported` (default), `flagged` or `resolved`. Conversation metadata, counts, and up to 20 reported enquiries. |
| POST | `/admin/safety/conversations/:id/open` | `{ reason }` (≥ 5 characters, saved in the audit log). A reported conversation returns every message (`scope: 'full'`). An unreported one returns only its flagged messages (`scope: 'flagged-only'`). |
| PUT | `/admin/safety/conversations/:id/resolve` | `{ resolution? }`. `400` if there is no open report. The reporter is notified. |
| POST | `/admin/safety/enquiries/:id/open` | `{ reason }`. Only for enquiries that were reported (`403` otherwise). Logged. |
| PUT | `/admin/safety/enquiries/:id/resolve` | `{ resolution? }`. `400` if there is no open report. |
| GET | `/admin/audit` | Admin access log (who opened what, and why), paged. |

### PUT /admin/settings/platform

| Field | Rule |
|---|---|
| `bookingApproval` | `manual` or `auto_verified`. |
| `reviewHours` | Clamped to 1-168. |
| `fullDayPackages` | Boolean (`true` or `'true'`). |
| `eventSlotHours` | 1-24, otherwise `400`. |
| `discounts.enabled` | Boolean. |
| `discounts.fullDay` | `{ enabled, percent }`. |
| `discounts.multiEvent` | `{ enabled, tiers: [{ minEvents 2-20, percent }] }`: up to 6 tiers, each `minEvents` different. |
| `discounts.multiDay` | `{ enabled, percent, minDays 2-10 }`. |
| `discounts.repeat` | `{ enabled, percent, minPriorBookings 1-20 }`. |
| `discounts.stacking` | `stack` or `best`. |
| `discounts.priority` | Every one of `full_day, multi_event, multi_day, repeat`, each exactly once, in order. |
| `discounts.maxPercent` | 0-100. |

All percentages must be between 0 and 100 (rounded to 2 decimals), otherwise `400`. Changes apply to new quotes only. Existing bookings keep the pricing snapshot they were saved with.

**Example request**

```json
{ "bookingApproval": "auto_verified", "discounts": { "maxPercent": 25, "multiEvent": { "tiers": [{ "minEvents": 2, "percent": 5 }, { "minEvents": 4, "percent": 12 }] } } }
```

---

## Development-only routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/dev/outbox/:file` | Opens an email saved to the local outbox (`server/.data/outbox`). The file name must match `[\w-]+\.html`. This route only exists when `NODE_ENV` is not `production`. |

`/uploads/*` is served as static files (cache 7 days) and is not under `/api`.
