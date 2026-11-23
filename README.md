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

## Roles

| Role | Can do |
|---|---|
| Customer | Search, request a booking, cancel it, call/WhatsApp after acceptance, review after completion |
| Provider | Profile, skills, price, portfolio photos; accept, reject, cancel and complete bookings |
| Admin | Overview, block/delete users, all bookings, delete reviews, read Contact messages |

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
| Bookings | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/provider`, `PUT /api/bookings/:id/status`, `PUT /api/bookings/:id/cancel` |
| Reviews | `POST /api/reviews`, `PUT/DELETE /api/reviews/:id`, `GET /api/reviews/:providerId` |
| Contact | `POST /api/contact` |
| Admin | `/api/admin/dashboard`, `/users`, `/bookings`, `/reviews`, `/messages` |
