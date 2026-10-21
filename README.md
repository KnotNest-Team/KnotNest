# KnotNest — Plan Your Perfect Beginning

A full-stack **MERN** wedding planning platform and vendor marketplace for Indian weddings. Couples plan their wedding and book vendors, vendors manage their business, and admins run the platform.

## Links

| | |
|---|---|
| 🌐 **Live website** | [Add hosting link here](#) |
| 🎨 **Figma design** | [Add Figma link here](#) |

## Features

- **Customers:** wedding planner with events, guest list with RSVP invitations, budget, checklist, vendor search and comparison, chat with vendors, and booking with advance payment.
- **Flexible bookings:** book an entire wedding day as a package or only selected events, across several days and vendors in one checkout, with live server-side pricing.
- **Discounts:** full-day, multi-event, multi-day and returning-couple discounts, with a configurable maximum.
- **Vendors:** business profile, packages, price per event, availability by date and time, bookings grouped by wedding, date or event, and analytics.
- **Admin:** booking reviews, vendor approvals, discount rules, homepage content, safety queue and reports.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT, bcrypt |

## Directory structure

```
knotnest/
├── client/                    # React frontend
│   └── src/
│       ├── admin/             # Admin dashboard pages
│       ├── customer/          # Customer pages (wedding, bookings, Plan & book)
│       ├── vendor/            # Vendor dashboard pages
│       ├── pages/             # Public pages (home, vendors, vendor profile)
│       ├── components/        # Shared UI components
│       ├── context/           # Auth, toast and compare state
│       ├── hooks/             # Custom React hooks
│       ├── layouts/           # Public and dashboard layouts
│       ├── routes/            # App routes and route guards
│       ├── services/          # API client
│       └── utils/             # Formatting and helpers
├── server/                    # Express backend
│   ├── config/                # Environment and database setup
│   ├── controllers/           # Route handlers
│   ├── middleware/            # Auth, uploads, errors
│   ├── models/                # Mongoose schemas
│   ├── routes/                # API routes
│   ├── services/              # Business logic (pricing, availability, bookings)
│   ├── seed/                  # Demo data
│   ├── tests/                 # Unit and API tests
│   └── server.js              # Entry point
├── scripts/                   # Dev and setup scripts
└── package.json
```

## Run locally (optional)

Requires **Node.js 18+**.

```bash
npm install          # installs everything and creates server/.env
npm run dev          # starts the API and the website
```

Set `MONGO_URI` in `server/.env` to your MongoDB connection string, then open **http://localhost:5173**.

> `server/.env` holds secrets and is not committed. Never share it publicly.

## Team

| Name | Role |
|---|---|
| Member 1 | Backend |
| Member 2 | Frontend |
| Member 3 | Frontend & documentation |
