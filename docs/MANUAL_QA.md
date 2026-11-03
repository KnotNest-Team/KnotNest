# KnotNest manual QA guide

These are step-by-step checks for the existing customer, vendor and admin journeys. Run them before a release, or after changing bookings, pricing, availability, invitations or permissions.

## Status of these checks

| What | Status |
|---|---|
| Journeys in this document (C*, V*, A*, X*) | **Proposed. Not executed.** Written from the client routes ([client/src/routes/AppRoutes.jsx](../client/src/routes/AppRoutes.jsx)), screen labels and server rules. None has been run in a browser yet. |
| Automated checks that back several expected results | **Executed** (November 2026, Windows 11, Node 24): `pricing.unit.test.js` 25/25, `pricing.regression.test.js` 34/34, `availability.regression.test.js` 26/26, and `npm run build` succeeded. These check server logic only. They do not check the UI. |

When you run a journey, record it in the [results log](#results-log) and change its status there. Do not edit the status above.

Button and heading text in quotes, such as "Book now", is copied from the source code at the time of writing. If the text has changed, follow the meaning of the step, and note the difference in the log.

---

## Before you start

### Environment (local only)

1. Follow [WINDOWS_DEVELOPMENT.md](WINDOWS_DEVELOPMENT.md) to set up.
2. Check that `server/.env` points at a **local or embedded** database (`MONGO_URI` on `127.0.0.1` or `localhost`, or `USE_MEMORY_DB=true`). These journeys create, change and delete data.
3. Keep email and payments offline: `MAIL_MODE=outbox`, `SMTP_*` empty, `RAZORPAY_*` empty.
4. Start with fresh demo data. Either delete `server/.data/db` (embedded database) and start the server, or run `npm run seed` **after** checking step 2. Then run `npm run dev` and open `http://localhost:5173`.
5. Use one browser profile per role, or private windows, so the three sessions don't overwrite each other. The token is kept in the browser's storage.

### Demo accounts (development only)

| ID | Role | Email | Password |
|---|---|---|---|
| `ADMIN` | Admin | `admin@knotnest.com` | `Admin@123` |
| `CUST` | Customer with a wedding profile, events, guests and favourites | `user@knotnest.com` | `User@123` |
| `VEND` | Approved vendor (the first seeded vendor) | `vendor@knotnest.com` | `Vendor@123` |
| `PEND` | Vendor waiting for approval ("Bedi Brothers Band") | `pending@knotnest.com` | `Vendor@123` |

### Default rules the expected results assume

The default platform settings ([server/models/Setting.js](../server/models/Setting.js)) are:

- approval: **manual**
- full-day packages: **on**
- event slot: **4 h**
- discounts:
  - full day: **15%**
  - multi-event: **5%** for 2+ events, **10%** for 3+
  - multi-day: **10%** for 2+ days
  - returning couple: **5%** after 1+ confirmed bookings
  - combining: **stack**, capped at **20%**
- advance: **10%** (`ADVANCE_PERCENT`)

If someone changed these in Admin → Discounts, reset them or run the seed again.

---

## Customer journeys

### C1. Register, sign in, sign out

**Prerequisites:** signed out.

| # | Step | Expected result |
|---|---|---|
| 1 | Go to `/register`. Register as a customer with a new email and a password of at least 6 characters. | You are signed in and taken to the customer area (`/customer/dashboard`). |
| 2 | Sign out, then register again with the same email. | Error: an account with this email already exists. |
| 3 | Go to `/login` and enter a wrong password. | "Invalid email or password". You stay signed out. |
| 4 | Sign in with the right password. | You are taken back to the customer dashboard. |
| 5 | While signed in as a customer, open `/admin`. | You are sent to `/unauthorized`. |
| 6 | Sign out and open `/customer/bookings`. | You are sent to `/login`. After signing in you can reach the page. |

### C2. Find vendors

**Prerequisites:** none (public).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/vendors` and search for `photographer`. | At least one result. Only approved vendors appear. "Bedi Brothers Band" (pending) never does. |
| 2 | Filter by city, a price range, verified only, and a minimum rating. Then sort by price, both directions. | The results narrow, and the order follows the sort. The page count changes when there are more than 9 results. |
| 3 | Filter by category "Photography". | Every result is a photographer. |
| 4 | Open a vendor. | The profile shows packages, event prices and published reviews. The calendar shows busy days and times, but no couple's details. |

### C3. Engage with a vendor (favourite, compare, enquiry, message)

**Prerequisites:** signed in as `CUST`.

| # | Step | Expected result |
|---|---|---|
| 1 | On a vendor profile, click the heart. | The vendor appears in `/customer/favourites`. Clicking it again removes the vendor. |
| 2 | Click "Compare" on two or three vendors, then open `/customer/compare`. | The vendors are shown side by side (up to 4). |
| 3 | Click "Enquire". Fill in the form with a phone number of 7+ digits and a message of 5+ characters, then send. | A success message appears. The enquiry is listed in `/customer/enquiries` as *pending*. `VEND` gets a notification if this is their profile. |
| 4 | Send an enquiry with a 2-character message. | It is refused, with a validation message on the message field. |
| 5 | Click "Message" and send `Call me on 98765 43210`. | The message is delivered, with a note asking you to keep bookings and payments on KnotNest (the phone-number flag). |
| 6 | Sign in as the vendor who owns that profile and open `/vendor/messages`. | The thread shows an unread count. The message text is there, and the flag is not shown to the vendor. |

### C4. Wedding profile and events

**Prerequisites:** a **new** customer from C1 (so there is no wedding profile yet).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/customer/guests`. | "Set up your wedding first". |
| 2 | In `/customer/wedding`, create the profile with a tradition, a main date at least 3 months away, and a muhurat such as `09:30`. | The profile is saved. The checklist is filled with default tasks that have due dates. Suggested events for the tradition are added. |
| 3 | Enter the muhurat `9.30`. | Error: enter a time like 09:30. |
| 4 | Add an event called "Cocktail" on the main date at `7:00 PM`. | It appears in the event list, sorted by date and time. |
| 5 | Give an event the map link `maps.google.com/x` (no `http`). | Error: the map link must start with http:// or https://. |
| 6 | Change the main wedding date by +7 days, and choose to move the events too. | Every event and every open checklist task moves by 7 days. Your own edits, such as the "Cocktail" time, are kept. |

### C5. Plan & book: several vendors, days and events in one checkout

**Prerequisites:** `CUST` (whose wedding plan has events on several days). Note two days that have **at least 2 events** each.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/customer/book` ("Plan & book"). | Upcoming wedding days are listed with their events. Events that already have open bookings show which vendor. |
| 2 | Day 1: choose the full day. Day 2: pick 2 individual events. Pick a category, then "Choose vendors". | Each vendor shows its own price for exactly this selection. Vendors with a calendar clash are marked unavailable and listed after the available ones. |
| 3 | Pick one vendor for both days and go to the review step ("Check everything before you confirm"). | The price breakdown shows: the full-day discount (15%) on day 1, the multi-event discount (5%) on day 2, and the multi-day discount (10%). The "Total discount" is no more than 20% of the price after packages. If the cap applied, the trimmed discount says so. |
| 4 | Change day 2 to 3 events. | The multi-event discount for day 2 changes from 5% to 10%. It is replaced, not added on top. The total is recalculated. |
| 5 | On one day, pick every event the vendor covers individually (2 or more). | If the vendor's full-day package is cheaper, the day is priced as the full day, with a note explaining why. |
| 6 | Add a second vendor in another category for one of the days. | One checkout with two vendors. The multi-day discount counts every day in the whole checkout. |
| 7 | In a second tab, as `ADMIN`, change a discount percentage, then confirm the checkout in the first tab. | Error: the price changed since your quote. The new quote is shown, and nothing is booked until you confirm again. |
| 8 | Confirm. | One booking per vendor, each *pending review* in `/customer/bookings`. The confirmation shows the same final amounts as the review step. |
| 9 | Double-click the confirm button quickly (repeat the steps with a new selection). | Only one set of bookings is created. |

### C6. Book one vendor from the profile

**Prerequisites:** `CUST`.

| # | Step | Expected result |
|---|---|---|
| 1 | On a vendor profile, click "Book now". | The "Request booking" dialog lists your wedding days. |
| 2 | Choose a date the vendor blocked (as `VEND`, block one first in `/vendor/availability`). | The vendor is not available on that date, and you cannot continue. |
| 3 | Choose a date that is free and continue to "Review your booking", then submit. | The booking is created as *pending review*. |
| 4 | Try to book the same vendor again for the same day and event. | It is refused: you already have an open booking with this vendor on that date. |

### C7. Booking lifecycle: confirm and pay the advance

**Prerequisites:** a booking from C5 or C6 that has been through A2 (approved) → V4 (accepted) → A3 (offer sent), so it is *awaiting customer*.

| # | Step | Expected result |
|---|---|---|
| 1 | In `/customer/bookings`, open the booking and look at the "Booking timeline". | It shows each step: requested, reviewed by KnotNest, accepted by the vendor, sent to you. |
| 2 | Click "Confirm booking". | Status *confirmed*. The message "Confirmed. Pay the advance to lock in your date." appears. The vendor is notified. |
| 3 | Click "Pay advance". | A **simulated payment** is shown, clearly labelled, because there are no Razorpay keys. No real payment page opens. |
| 4 | Finish the simulated payment. | The advance is marked as paid, for 10% of the booking amount (rounded). Both sides are notified. The button disappears. |
| 5 | (Optional, API.) Call `POST /api/payments/order` again for the same booking. | `409`: the advance is already paid. |

### C8. Review after a completed booking

**Prerequisites:** a confirmed booking whose last day has passed. To get one locally, an admin can mark any confirmed booking *completed* (admins are not limited by the date).

| # | Step | Expected result |
|---|---|---|
| 1 | On a booking that is not completed, look for "Write review". | It is not available. (The API refuses with: you can only review vendors after a completed booking.) |
| 2 | After it is completed, write a 4-star review with a comment. | The review is published on the vendor's profile, and the vendor's average rating updates. |
| 3 | Try to review the same booking again. | Refused: you already reviewed this booking. |

### C9. Guests, invitations and RSVP

**Prerequisites:** `CUST`, with `MAIL_MODE=outbox`.

| # | Step | Expected result |
|---|---|---|
| 1 | In `/customer/guests`, click "Add guest". Enter a name, an email, side "bride", and up to 3 guests. | The guest is added and invited to every event by default. |
| 2 | Add another guest with the same email. | Refused: that email is already on your guest list. |
| 3 | Click "Import" and paste 3 lines, one of them with a broken email. | 2 guests are added, and 1 is skipped with the reason shown. |
| 4 | Preview the invitation (and the reminder version). | The email shows the couple's names and each event the guest is invited to, with date and venue. |
| 5 | Click "Send N new invitations". | The status moves from *queued* to *sent*. An HTML file appears in `server/.data/outbox/` and opens from the Guests page. **No real email is sent.** |
| 6 | Copy a guest's RSVP link (`/rsvp/<token>`) and open it in a private window. | The invitation page appears without signing in. It shows only that guest's events. |
| 7 | Answer *attending* for one event with a headcount of 4 when the maximum is 3. | Error: enter between 1 and 3 people. |
| 8 | Answer *attending* with 2 people, choose a food preference and save. Then sign in as the couple again. | The couple has a "New RSVP" notification. The Guests summary counts this guest as attending, with a headcount of 2. |
| 9 | Open `/rsvp/not-a-real-token`. | "This invitation link is not valid". |

### C10. Budget and checklist

| # | Step | Expected result |
|---|---|---|
| 1 | In `/customer/budget`, add an expense in the "Venue" category for ₹50,000. | Total spent goes up by 50,000, and the remaining budget goes down by the same amount. The category chart shows "Venue". |
| 2 | Add an expense with a negative amount. | Refused. |
| 3 | In `/customer/checklist`, tick a task, then add and delete a custom task. | Progress (%) updates on the checklist and on the dashboard. |

### C11. Cancelling releases the vendor's calendar

**Prerequisites:** a booking that is *awaiting customer* or *confirmed* for an event at a known time (the vendor holds that slot).

| # | Step | Expected result |
|---|---|---|
| 1 | As `VEND`, check `/vendor/availability`. | The booked slot is shown on that date. |
| 2 | As `CUST`, cancel the booking. | Status *cancelled*. The vendor is notified. |
| 3 | As `VEND`, check availability again. | The slot (or the whole day, for a full-day booking) is free again. |

---

## Vendor journeys

### V1. A pending vendor is not public

**Prerequisites:** none.

| # | Step | Expected result |
|---|---|---|
| 1 | Search `/vendors` for "Bedi". | No results. |
| 2 | Sign in as `PEND` and open the vendor dashboard. | "Your profile is **pending**. It will appear in the marketplace once an admin approves it." Profile details can still be edited. |
| 3 | Register a new vendor at `/register` with a business name and category. | The account is created, and the profile is *pending*. The admin gets a "New vendor registration" notification. |

### V2. Profile, packages, event prices, full-day package

**Prerequisites:** `VEND`.

| # | Step | Expected result |
|---|---|---|
| 1 | In `/vendor/pricing`, set prices for Haldi, Sangeet and Wedding, and enter "Haldi" twice with different prices. | Saved. The duplicate name is kept only once. |
| 2 | Turn the full-day package on with a price lower than the sum of the event prices. | The public profile shows "Full-day package from ₹...". |
| 3 | Turn the full-day package off. | The profile says "Books individual events only." In Plan & book, a full-day selection for this vendor is refused. |
| 4 | In `/vendor/packages`, add a "Gold" package. | Couples can choose it, and it prices every chosen event at the Gold price. |
| 5 | Limit the events offered to "Sangeet" and "Reception". | A couple asking for this vendor's Haldi is told the vendor does not provide services for Haldi. A full day only includes the events the vendor covers. |

### V3. Availability

| # | Step | Expected result |
|---|---|---|
| 1 | In `/vendor/availability`, block a future date. | It is listed under "Blocked dates (N upcoming)". |
| 2 | As `CUST`, try to book this vendor on that date. | Refused: the vendor is not available on that date. |
| 3 | Unblock it. | The date can be booked again. |

### V4. Respond to booking requests

**Prerequisites:** a booking for `VEND` that is *requested* (approved by the admin in A2). For the clash steps, create two bookings by **different** customers with this vendor on the same date: one for an event at 10:00 AM, one at 12:00 PM (with the 4-hour slot, these overlap).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/vendor/bookings`. | Requested bookings are listed. Bookings still waiting for the admin (*pending review*) are **not** shown. |
| 2 | Accept the 10:00 AM booking, changing the price. | Status *vendor accepted*. The price change is recorded and goes to the admin to review. The 10:00 AM to 2:00 PM slot is held. |
| 3 | Accept the 12:00 PM booking. | Refused with a calendar clash naming the date. Nothing is held for this booking. |
| 4 | Decline it instead. | Status *vendor declined*. The admin is notified. |
| 5 | (Adjacent slots.) Repeat with events at 10:00 AM and 2:00 PM. | Both can be accepted: a slot that ends at 2:00 PM does not clash with one that starts at 2:00 PM. |
| 6 | Try "Complete" on a confirmed booking whose last day is in the future. | Refused, with the date of the last day. |

> **Known issue (found while writing the automated tests, still open):** if the clashing slot runs to midnight (for example an event at 10:00 PM with the 4-hour slot), the error says "booked 10:00 PM to **12:00 PM**" instead of 12:00 AM. The clash detection itself is right. Only the wording is wrong.

### V5. Enquiries, reviews, messages, analytics

| # | Step | Expected result |
|---|---|---|
| 1 | In `/vendor/enquiries`, mark an enquiry *contacted* and add a response. | The customer gets a "Vendor response" notification. |
| 2 | In `/vendor/reviews`, reply to a review. | The reply appears under the review on the public profile. |
| 3 | Report a review. | The admins get a "Review reported" notification. The review stays visible until an admin acts. |
| 4 | Report a message thread with a reason shorter than 5 characters, then with a longer one. | Short: refused. Longer: "Reported. Our team will review this conversation." |
| 5 | Open `/vendor/analytics`. | Charts load without errors. The view count goes up after a signed-out visitor opens the profile. Your own visits are not counted. |

---

## Admin journeys

### A1. Vendor approval and moderation

**Prerequisites:** `ADMIN`.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/admin/approvals`. | "Bedi Brothers Band" is listed as *pending*. |
| 2 | Approve it. | It now appears in `/vendors`. `PEND` is notified. |
| 3 | In `/admin/vendors`, suspend it. | It disappears from public search. Its public profile URL returns "not found". |
| 4 | Verify a vendor and feature another. | The verified badge shows. The featured vendor can appear on the homepage. |

### A2. Booking review queue

**Prerequisites:** at least one *pending review* booking (from C5 or C6).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/admin/booking-reviews`. | Bookings are listed oldest first, with the waiting time. Those waiting longer than the target (24 h by default) are marked overdue. Checks shown: vendor verified, price as listed, number of days and events, discount, and "Vendor calendar free". |
| 2 | Look at a booking whose vendor has since blocked one of its dates. | "Vendor calendar free" is not ticked, and the clashing dates are named. |
| 3 | Click "Reject" without a reason. | Not allowed: a reason sent to the couple is required (at least 5 characters). |
| 4 | Reject with a reason. | Status *cancelled*. The couple sees the reason. The vendor never saw this booking. |
| 5 | On another booking, click "Approve and send to vendor". | Status *requested*. The vendor gets "New booking request". The couple is told it was approved. |

### A3. Pass the vendor's reply to the couple

| # | Step | Expected result |
|---|---|---|
| 1 | Open a *vendor accepted* booking from V4 (step 2). | The price change is shown next to the original quote. |
| 2 | Click "Send offer to couple". | Status *awaiting customer*. The couple gets "<vendor> can do your date!". |
| 3 | Open the *vendor declined* booking from V4 (step 4) and click "Tell the couple", with a suggestion. | Status *cancelled*. The couple receives the message. |
| 4 | On a *vendor accepted* booking, click "Cancel" with a reason. | Status *cancelled*. The vendor's hold on those days or slots is released (check as in C11). |

### A4. Discount rules

**Prerequisites:** `ADMIN` in one window and `CUST` in another.

| # | Step | Expected result |
|---|---|---|
| 1 | In `/admin/discounts`, change the full-day discount from 15% to 12% and click "Save discount rules". | Saved. A **new** quote in Plan & book uses 12%. Bookings that already exist keep their saved price. |
| 2 | Enter a percentage of 150. | Refused: must be a percentage between 0 and 100. |
| 3 | Add a multi-event tier with the same number of events as an existing tier. | Refused: each tier needs a different number of events. |
| 4 | Set the maximum combined discount to 10%, then quote a full day on two days for `CUST`. | The total discount stops at 10% of the price after packages. Discounts lower in the priority order are shown as reduced or not applied. |
| 5 | Switch stacking to "best". | Only the single largest discount type applies. |
| 6 | Turn full-day packages off for the whole marketplace. | Couples cannot pick a full day for any vendor, and no automatic full-day upgrade happens. |
| 7 | Put every setting back to the defaults listed [above](#default-rules-the-expected-results-assume). | |

### A5. Automatic approval for verified vendors

| # | Step | Expected result |
|---|---|---|
| 1 | In Booking reviews, switch approval to "Automatic for verified vendors". | Saved. |
| 2 | As `CUST`, book a **verified** vendor, and separately an unverified one. | Verified vendor: the booking goes straight to *requested*, and the vendor is notified at once. Unverified vendor: it is still *pending review*. |
| 3 | As the verified vendor, accept without changing the price. | It goes straight to *awaiting customer*, without an admin step. |
| 4 | Accept another one with a price change. | It stops at *vendor accepted* for the admin to review. |
| 5 | Switch back to "Manual (managed marketplace)". | |

### A6. Safety and privacy

**Prerequisites:** the conversation reported in V5 (step 4), and the flagged message from C3 (step 5).

| # | Step | Expected result |
|---|---|---|
| 1 | Open `/admin/enquiries`. | Enquiries are listed **without** their message text. |
| 2 | Open `/admin/safety` → reported. | The reported conversation is listed, without its messages. |
| 3 | Open it with a reason shorter than 5 characters. | Refused: a reason is required, and it is saved in the audit log. |
| 4 | Open it with a proper reason. | Every message is shown. A new audit log entry records your name, the action and the reason. |
| 5 | Switch the filter to flagged, and open an unreported but flagged conversation. | Only the flagged messages are shown (flagged only). |
| 6 | Resolve the report with a resolution note. | The person who reported it is notified. The thread moves to *resolved*. |

### A7. Users

| # | Step | Expected result |
|---|---|---|
| 1 | In `/admin/users`, search for `user@knotnest.com`. | The demo customer is found. |
| 2 | Suspend a test customer (from C1). Then, in that customer's window, reload the page. | Their next request fails with "Your account has been suspended". Signing in is refused as well. |
| 3 | Try to suspend or demote your own admin account. | Refused. |
| 4 | Delete the test customer. | The user and their wedding, expenses, guests and conversations are removed. |

### A8. Categories, locations, homepage

| # | Step | Expected result |
|---|---|---|
| 1 | Try to delete a category that has vendors. | Refused: deactivate it instead of deleting. |
| 2 | Deactivate a category. | It disappears from the public category list. It is still listed, as inactive, in `/admin/categories`. |
| 3 | Edit the homepage hero text in `/admin/homepage` and save. | The landing page `/` shows the new text. |
| 4 | Send the contact form at `/contact` (public), then open the admin notifications. | A "New contact message" notification and the message itself are there. |

---

## Cross-cutting checks

| ID | Check | Expected result |
|---|---|---|
| X1 | Each role opens the other roles' areas (`/customer`, `/vendor`, `/admin`). | `/unauthorized` every time. |
| X2 | In the browser's dev tools, replace the saved token with an invalid value (or wait until it expires), then use the app. | The next API call returns 401. The app clears the token and goes back to sign-in ([client/src/services/api.js](../client/src/services/api.js)). |
| X3 | Upload a `.gif` or a file larger than 5 MB as a vendor portfolio image. | Refused: only JPG, PNG or WEBP, or the file is too large. |
| X4 | Resize to a phone width (375 px) and go through C5 and C9 (step 6). | All steps can be completed. Nothing important is cut off. |
| X5 | Keyboard only: sign in, search for vendors, open a profile, open "Book now", close it. | Focus is always visible. Dialogs can be closed with Esc or a reachable button. |
| X6 | While working through the journeys, watch the `[server]` terminal output. | No unhandled errors or stack traces, apart from the ones the steps expect. |

---

## Results log

Copy this table for each run. Mark a journey **Executed** only when you have actually done its steps.

| Date | Build / commit | Tester | Journey | Status (Executed: pass / Executed: fail / Blocked / Skipped) | Notes, bug links |
|---|---|---|---|---|---|
| | | | | | |

When a step fails, record:

- the journey and step number
- the account used
- what you expected and what you saw
- any error text
- the `[server]` log lines from around that time
