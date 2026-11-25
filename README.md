# Women Skill Platform

A marketplace where customers find and book skilled women near them — mehndi, tailoring,
tuition, cooking, beauty and more — and where those women take bookings in their own name.

| Folder | What it is |
|---|---|
| `backend/` | Node.js + Express 5 REST API, MongoDB (Mongoose), JWT auth, Cloudinary uploads |
| `frontendd/` | React 19 + Vite app |

## Run it locally

You need Node.js 20+ and a MongoDB database (Atlas or local).

**1. Backend (port 5000)**

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

**2. Frontend (port 5173)**

```bash
cd frontendd
npm install
npm run dev
```

Open http://localhost:5173. To point the frontend at another API, set
`VITE_API_URL` (for example in `frontendd/.env.local`):

```
VITE_API_URL=https://api.example.com/api
```

## Password reset email

"Forgot password?" on the login page emails a link that is valid for 30 minutes.
Only a hash of the link's token is stored, and using it signs the account out everywhere.

- **Development:** with `SMTP_HOST` empty, no email is sent. The reset link is printed
  in the backend console and appended to `backend/dev-mail.log`.
- **Real email:** fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`
  in `backend/.env` (see `.env.example` for Gmail and Brevo settings), then restart the API.
- **Live server:** set `NODE_ENV=production` and `CLIENT_URL` to the real site address,
  so links point to it and a missing SMTP setup shows up as an error.

## Provider verification

Providers upload a photo of a government ID from **Verification** in their account.
An admin reviews it under **Admin → Verifications** and approves or rejects it (with a reason).
Approved providers get a **✓ Verified** badge and appear in the "Verified only" search filter.

Privacy rules built in:
- ID numbers are never asked for or stored; only the photo and the ID type.
- The photo is uploaded to Cloudinary as a **private** asset (no public URL). Admins open
  it through a signed link that expires after 10 minutes.
- The photo is **deleted as soon as an admin decides**, when it is replaced, or when the
  account is deleted. Only the status, ID type and dates are kept.
- The provider gets an email with the outcome (uses the same SMTP settings as password reset).
- **Customers can verify their ID too** (Account → ID verification). Providers see
  "✓ Verified customer" on requests and can choose to accept verified customers only.

## Where, how long and how much

Providers set this under **Services & prices**; customers see it on the profile and pick it
when booking.

- **Where:** "I go to the customer's place" and/or "Customers come to my place". For visits to
  her place, her address is shown to the customer only after she accepts.
- **Travel charge** (home visits): distance from her private base location to the customer's
  shared location (straight line, rounded to 0.5 km). Free up to X km, then slabs such as
  *up to 5 km ₹50, up to 10 km ₹100*, then ₹/km beyond, with an optional maximum distance.
  The price is worked out on the server, so her exact location is never sent to anyone.
- **Packages by time:** e.g. 2 hours ₹500, 5 hours ₹1,100, Overnight (12 h) ₹2,500.
  Every booking stores a start and end time and a copy of the package and price.
- **Overtime:** a per-hour rate; when she marks the work completed she enters the extra time,
  and the final amount (service + travel + overtime) is shown to both sides.

## Availability calendar

Under **Availability** a provider sets weekly working hours per day and marks days off on a
month calendar that also shows her bookings. Customers pick from a 30-day strip that only offers
open days and start times where the chosen package fits her hours (overnight packages may run
past closing) and does not overlap another pending/accepted booking. The server checks the
same rules, so two customers cannot take the same slot.

## Safety

- Customers must have a phone number on their account to book.
- **Check-in / check-out** on home visits ("I've arrived" / "I've left safely"). If she has not
  checked out an hour after the booking ends, she and the admins are alerted (once).
- **SOS button** on every provider page (two taps). It records her live location and the
  booking she is on, then alerts: all admins (bell + email), her emergency contacts (email, plus
  one-tap Call / WhatsApp / SMS links on her phone) and providers who opted in and are based
  within 5 km. The dialog also offers a direct 112 call. She or an admin closes the alert, and
  everyone is told she is safe. Admins see live alerts under **Admin → SOS alerts**.
- Automatic SMS/WhatsApp delivery needs a paid gateway (e.g. MSG91, WhatsApp Cloud API) and is
  not wired in; email and in-app alerts work today.

## Rating, reporting and blocking customers

- **Rate a customer** (provider, after a completed booking): 1–5 stars, quick tags (on time,
  respectful, late, felt unsafe…) and a private note only admins see. One rating per booking.
  Customers see their own average on My bookings, never who rated them.
- **Every request shows the customer's track record** to the provider: average rating from
  providers, and "⚠️ Reported by N providers" once two or more different providers have an open
  or upheld report about them.
- **Report a customer** from any booking: harassment, unsafe, abusive, no-show, payment, fake,
  other. Harassment/unsafe reports are marked serious, listed first and always emailed to admins.
  The customer is never told who reported them.
- **Block a customer** (optionally while reporting). They can no longer book her and see only
  "not taking bookings from your account". Her blocked list and report statuses are on the
  Safety page, with Unblock.
- **Admin → Customer reports:** warn the customer (in-app + email), block them from the platform,
  close, or dismiss (note required). The reporting provider is told the outcome.

## Changing the booking time

Either side can ask to move a **pending** or **accepted** booking instead of cancelling it.

- **Customer:** *🕑 Change time* on the booking card. **Provider:** *🕑 Change time* on an accepted
  booking, or *🕑 Suggest another time* on a new request (a counter-offer instead of rejecting it).
- The picker shows the provider's calendar for the next 30 days; the booking's own slot counts as free.
  The new time must be inside her working hours, not clash with other bookings, and at least an hour away.
- The other side gets an in-app + email notification and a banner with **Accept new time** /
  **Keep original time**. The person who asked can **Withdraw** until then. Until someone accepts,
  the booking keeps its original time.
- Accepting moves the booking, re-arms the reminder and safety check-out alerts, and adds a
  "Rescheduled from …" line. Accepting a provider's counter-offer on a pending request also confirms it.
- A pending request with an open counter-offer for a later time does not expire.
- Limits: one open request at a time, at most 3 requests per booking, not after the visit has started.

## Notifications

Signed-in users have a 🔔 bell in the header with an unread count (refreshed on every page
change, every minute and when the tab comes back into view). Each notification links to the
right page. The same events are emailed, unless the person unticks "Email me about bookings
and reviews" on their profile (ID-check results are always emailed).

| Event | Who is told |
|---|---|
| New booking request | Provider |
| Accepted / declined / completed / cancelled by provider | Customer |
| Cancelled by customer | Provider |
| Request expired without a reply | Both (provider in-app only) |
| Booking within the next 24 hours (sent once) | Both |
| New review | Provider |
| ID verification approved / rejected | Provider |

Notifications older than 90 days are removed automatically. Reminders and expiries are
handled by the background job that runs at startup and every 15 minutes.

## Roles

| Role | Can do |
|---|---|
| Customer | Search, request a booking, cancel it, call/WhatsApp after acceptance, review after completion |
| Provider | Profile, skills, price, portfolio photos, ID verification; accept, reject, cancel and complete bookings |
| Admin | Overview, block/delete users, all bookings, delete reviews, read Contact messages, verify providers |

Admins cannot sign up from the site. Promote an existing user in the database:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

## Booking lifecycle

```
pending ──accept──► accepted ──complete (after booking date)──► completed ──► review
   │                   │
   │                   └──cancel──► cancelled (by provider, or by customer before the booking time)
   ├──reject──► rejected (by provider)
   ├──cancel──► cancelled (by customer, before the booking time)
   └──booked time passes with no reply──► expired (automatic)
```

- Unanswered requests expire automatically once their time passes (checked at
  startup, every 15 minutes, and whenever booking lists are loaded).
- Accepted bookings whose date has passed are shown as **Overdue** until the
  provider marks them completed or cancels them; admins see a count on the overview.
- A provider's phone and WhatsApp are shared with a customer only after she accepts.
- A customer can have one pending request per provider at a time.
- One review per customer per provider, only after a completed booking.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/profile`, `PUT /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`, photo and portfolio uploads |
| Providers | `GET /api/users/search`, `GET /api/users/:id` |
| Bookings | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/provider`, `PUT /api/bookings/:id/status`, `PUT /api/bookings/:id/cancel`, `POST/DELETE /api/bookings/:id/reschedule`, `PUT /api/bookings/:id/reschedule/respond` |
| Reviews | `POST /api/reviews`, `PUT/DELETE /api/reviews/:id`, `GET /api/reviews/:providerId` |
| Contact | `POST /api/contact` |
| Provider settings | `GET/PUT /api/providers/settings` (provider); `GET /api/providers/:id/availability`, `POST /api/providers/:id/quote` (public) |
| Customer feedback | `POST /api/customer-feedback/ratings`, `GET /api/customer-feedback/ratings/mine`, `POST /api/customer-feedback/reports`, `GET /api/customer-feedback/reports/mine`, `GET/POST/DELETE /api/customer-feedback/blocked[/:id]` (provider); `GET /api/admin/reports`, `PUT /api/admin/reports/:id` (admin) |
| Safety | `POST /api/sos`, `GET /api/sos/mine`, `PUT /api/sos/:id/resolve`, `GET /api/sos/admin`; `PUT /api/bookings/:id/check-in`, `PUT /api/bookings/:id/check-out` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |
| Verification | `GET /api/verification/me`, `POST /api/verification` (provider); `GET /api/admin/verifications`, `GET /api/admin/verifications/:id/document`, `PUT /api/admin/verifications/:id` (admin) |
| Admin | `/api/admin/dashboard`, `/users`, `/bookings`, `/reviews`, `/messages`, `/verifications` |
