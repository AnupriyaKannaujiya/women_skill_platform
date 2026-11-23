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
   ├──reject──► rejected (by provider)
   └──cancel──► cancelled (by customer, before the booking time)
```

- A provider's phone and WhatsApp are shared with a customer only after she accepts.
- A customer can have one pending request per provider at a time.
- One review per customer per provider, only after a completed booking.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/profile`, `PUT /api/auth/change-password`, photo and portfolio uploads |
| Providers | `GET /api/users/search`, `GET /api/users/:id` |
| Bookings | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/provider`, `PUT /api/bookings/:id/status`, `PUT /api/bookings/:id/cancel` |
| Reviews | `POST /api/reviews`, `PUT/DELETE /api/reviews/:id`, `GET /api/reviews/:providerId` |
| Contact | `POST /api/contact` |
| Admin | `/api/admin/dashboard`, `/users`, `/bookings`, `/reviews`, `/messages` |
