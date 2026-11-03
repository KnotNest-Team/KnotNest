# Wedding-planner prototypes (not integrated)

> **Status: reference code only.** These are prototypes, not KnotNest features. Nothing here is shipped, imported, routed, linked from navigation, built, served or tested. The live site and `npm run build` do not include this folder.

This folder holds four planning tools, written as standalone React components with their logic kept in pure functions. They use one invented sample wedding.

| Prototype | Logic | Component | What it does |
|---|---|---|---|
| Wedding-day timeline | [lib/timeline.js](lib/timeline.js) | [components/DayTimeline.jsx](components/DayTimeline.jsx) | Lays the day out by venue space. Flags vendor and space clashes, items that start before what they depend on has finished, too little walking time, a ritual that misses the muhurat, and music past the sound curfew. Moving an item pushes the items that depend on it, but never moves a fixed ritual. Also builds a vendor call sheet and finds free gaps in a space. |
| Guest seating | [lib/seating.js](lib/seating.js) | [components/SeatingPlanner.jsx](components/SeatingPlanner.jsx) | Seats whole households. Hard rules are table capacity, step-free tables for wheelchair users, and households kept apart. It prefers close family near the stage, keeps sides and friend groups together, and keeps quiet households away from the speakers. Places guests greedily, then improves by moving or swapping households. Manual moves are checked against the same rules. |
| Vendor comparison | [lib/vendorCompare.js](lib/vendorCompare.js) | [components/VendorComparison.jsx](components/VendorComparison.jsx) | Turns flat, per-plate, per-hour and per-event pricing into full quotes (minimums, travel, 18% GST). Adjusts ratings for review count, scores vendors with weights the couple sets, ranks vendors busy on the date last, and points out options that another vendor beats on price, rating and coverage. |
| Budget breakdown | [lib/budget.js](lib/budget.js) | [components/BudgetBreakdown.jsx](components/BudgetBreakdown.jsx) | Forecasts each line from contract, then quote, then plan. Shows the variance per category, the position against the budget with a contingency kept aside, upcoming and overdue instalments, cash needed per month, instalment plans that don't add up, and suggested moves of unspent, unsigned money to cover overruns. |

[PlannerPrototype.jsx](PlannerPrototype.jsx) puts all four in tabs. [data/sampleWedding.js](data/sampleWedding.js) holds the sample data. [lib/format.js](lib/format.js) and [components/ui.jsx](components/ui.jsx) are small local copies of the app's formatting helpers and card styles.

## Sample data

Everything in `data/sampleWedding.js` is made up: the couple, the households (described by relationship, with no personal names), the vendors, the venue and every amount. There are no phone numbers, email addresses, IDs, payment details or credentials. The data is built to show the checks working:

- The live band set runs past the 22:00 sound curfew.
- The family has no walking time between the milni and the jaimala.
- Two related households are kept apart.
- 107 reception guests fit into 110 seats.
- One photographer is already booked on the date.
- A photographer rated 4.9 from only 9 reviews counts for less than one rated 4.8 from 64.
- Several budget categories run over their plan.

## Why it is not part of the app

These are kept out of the build on purpose, and are not run:

- **Build:** Vite's root is `client/`, and it only bundles what `client/src/main.jsx` imports. Nothing imports this folder.
- **Styles:** Tailwind only scans `client/index.html` and `client/src/**`. The Tailwind classes here would not even be generated.
- **Served files:** public assets come from `client/public/`. In production Express serves only `client/dist/` and `server/uploads/`.
- **Code:** these files import only `react` and each other, never the application. Nothing in `client/`, `server/` or `scripts/` imports them.
- **Tests:** there are none. The logic has not been run against the sample data, so treat the results described above as intended, not observed.

## If you want to try one out

Integrating a prototype is a product decision, not a copy-paste. A reasonable path:

1. Move the pure logic (`lib/*.js`) into `client/src/utils/` or a server service, and add unit tests next to the existing ones in `server/tests/`.
2. Replace `components/ui.jsx` with the app's `Card`, `Badge` and `Button`, and `lib/format.js` with `client/src/utils/format.js`.
3. Load real data from the existing API (`/api/wedding`, `/api/wedding/guests`, `/api/expenses`, `/api/vendors/compare`) instead of the sample file. Seating, timeline items and payment instalments have no backing models yet, so they would need schema and API work first.
4. Add a route in `client/src/routes/AppRoutes.jsx` and a link in `CUSTOMER_NAV`.
