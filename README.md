# KnotNest — Plan Your Perfect Beginning

A full-stack **MERN** wedding planning platform and vendor marketplace for Indian weddings. Couples plan their wedding and book vendors, vendors manage their business, and admins run the platform.

## Links

| | |
|---|---|
| 🌐 **Live website** | [knotnest.onrender.com](https://knotnest.onrender.com) |
| 🎨 **Figma design** | [KnotNest – UI Design](https://www.figma.com/design/BQSgyygn4W5zYWVIL1rlxm/KnotNest-%E2%80%93-UI-Design) |
| 📦 **Repository** | [github.com/KnotNest-Team/KnotNest](https://github.com/KnotNest-Team/KnotNest) |
| 🚀 **Deployment guide** | [DEPLOYMENT.md](DEPLOYMENT.md) |

> The site runs on Render's free plan and sleeps after 15 minutes without traffic. The first visit after that can take up to a minute to load.

## Features

- **Customers:** wedding planner with tradition-based events, guest list with themed invitations and per-event RSVP, budget, checklist, vendor search and comparison, chat with vendors, and booking with an advance payment.
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
| Media and email | Cloudinary, Nodemailer with Brevo SMTP |
| Hosting | Render (one web service, deployed from `render.yaml`) |

## Directory structure

```
knotnest/
├── client/                    # React frontend
│   └── src/
│       ├── admin/             # Admin dashboard pages
│       ├── customer/          # Customer pages (wedding, guests, bookings, Plan & book)
│       ├── vendor/            # Vendor dashboard pages
│       ├── pages/             # Public pages (home, vendors, vendor profile, RSVP)
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
│   ├── services/              # Business logic (pricing, availability, bookings, email)
│   ├── seed/                  # Demo data
│   ├── tests/                 # Unit and API tests
│   └── server.js              # Entry point (also serves the built React app in production)
├── scripts/                   # Dev and setup scripts
├── render.yaml                # Render Blueprint
├── DEPLOYMENT.md              # How the live site is deployed
└── package.json
```

## Run locally

Requires **Node.js 18+**.

```bash
git clone https://github.com/KnotNest-Team/KnotNest.git
cd KnotNest
npm install          # installs server + client and creates server/.env
npm run dev          # starts the API and the website
```

Open **http://localhost:5173**. If no local MongoDB is running, the server starts an embedded development database and fills it with demo data automatically. To use MongoDB Atlas instead, set `MONGO_URI` in `server/.env`.

| Command | What it does |
|---|---|
| `npm run dev` | API and website together, with hot reload |
| `npm run seed` | Reset the database to the demo data (**deletes existing data**) |
| `npm test` | Unit tests and API tests |
| `npm run build` / `npm start` | Production build and server |

> `server/.env` holds secrets and is ignored by Git. Never commit it or paste it anywhere public.

## Team

| Name | Roll No. | Contribution |
|---|---|---|
| Samiksha Phirangi | 16010124241 | Documentation, deployment guide and testing |
| Sara Potdar | 16010124243 | Frontend: React client, customer, vendor and admin dashboards, RSVP views |
| Amit Rambhia | 16010124249 | Backend: API, database models, services, tests and deployment config |

Full Stack Development Laboratory · Dept. of Computer Engineering, K. J. Somaiya School of Engineering
