# KnotNest business model

KnotNest is a **managed, two-sided wedding marketplace**. Couples plan for free; vendors pay for reach and bookings; KnotNest stays in the middle of every booking to guarantee quality and trust.

## Who we serve

| Side | Their problem | What KnotNest gives them |
|---|---|---|
| **Couples** | Hundreds of decisions, scattered vendors, fear of being cheated, typing guest lists, chasing RSVPs | Tradition-based planning in one click, verified vendors, every booking checked by KnotNest, guest list + RSVP, budget and checklist. **Free.** |
| **Vendors** | Finding genuine couples, fake enquiries, chasing payments | Verified leads, bookings reviewed before they arrive, advance payments, analytics, reviews from real customers |
| **Guests** | Paper invites, unclear schedules | Personal invitation with every function, meaning, venue and map; RSVP without an account |

## Why a managed marketplace

Weddings are high-value, one-time, emotional purchases. A bad vendor can't be "returned". So KnotNest reviews **both directions** of every booking:

```
Couple requests ──▶ KnotNest reviews ──▶ Vendor accepts / declines ──▶ KnotNest reviews ──▶ Couple confirms ──▶ Advance paid
```

- **Before the vendor sees it:** genuine couple? realistic date and package? fair price?
- **Before the couple sees it:** did the vendor change the price? is the reply complete? if the vendor declined, KnotNest suggests alternatives instead of leaving the couple stranded.
- Every step is recorded in a **booking timeline** visible to the couple and vendor (each sees only the notes meant for them).
- The vendor's date is **held** the moment they accept, so two couples can never get the same date.

This gives us: **quality control, fraud prevention, dispute evidence, and commission protection** (deals stay on the platform).

### Scaling the review without slowing down

| Stage | Approval mode | Admin workload |
|---|---|---|
| Launch (now) | **Manual**: every request and reply is reviewed | Low volume, high trust; builds the brand |
| Growing | **Automatic for verified vendors**: verified vendors skip review; new vendors, price changes and declines still come to the admin | Admin focuses on risk |
| Large scale | Automatic by default, rules + fraud signals decide what needs a human | Admin handles exceptions and disputes |

Both modes are a single switch in **Admin → Booking reviews**, with a review-time target (e.g. 24 hours) and overdue highlighting.

## Revenue streams

| Stream | How it works | In the project |
|---|---|---|
| **Booking commission** | ~8% of each confirmed booking value, recorded when the couple pays the advance through KnotNest (Razorpay) | ✅ Built (`COMMISSION_PERCENT`, admin earnings report) |
| **Featured listings** | Vendors pay to appear on the homepage and top of search | ✅ Featured flag + homepage section (billing is future work) |
| **Verification badge** | Paid document and quality check; verified vendors also get faster (auto-approved) bookings | ✅ Verified flag + auto-approval for verified vendors |
| **Vendor subscriptions** | Free / Pro / Premium: portfolio size, analytics, lead priority | Future |
| **Advertising** | Banners and offers from jewellers, bridal wear, honeymoon travel | ✅ Homepage banners and offers (CMS) |
| **Concierge planning** | Premium service: a KnotNest planner coordinates all vendors for the couple | Future, natural extension of the managed model |

## Growth loop

1. A couple plans on KnotNest and sends invitations to 300+ guests.
2. Every guest opens a beautiful KnotNest RSVP page, many of them planning weddings themselves.
3. Some become the next couples → more bookings → more vendors join.

## Trust and safety (part of the product, not an add-on)

- Bookings reviewed in both directions; vendor dates held atomically.
- Reviews only from completed bookings.
- Chat scam detection (phone numbers, UPI IDs, links, abuse) and reporting.
- Private messages readable by admins only after a report, with a logged reason (audit log).
- Advance payments verified by signature; simulated payments disabled in production.

## Key metrics to track

Booking conversion (request → confirmed), **review time** (target ≤ 24 h), vendor acceptance rate, advance payment rate, commission per wedding, repeat vendors, guests reached per wedding, couples acquired from RSVP pages.
