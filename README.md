# BookOneThing

The easy way to share anything with anyone. 

Set up your thing. Share the link. Done.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router) |
| Database + Auth | Supabase |
| Deployment | Railway |
| Billing | Stripe |
| Email + ICS | Resend |
| Version control | GitHub |

---

## Project structure

```
bookonething/
├── app/
│   ├── [slug]/               # Public booker view — anyone with the link
│   │   └── page.tsx
│   ├── setup/                # Owner setup flow (SetupV1)
│   │   └── page.tsx
│   ├── dashboard/            # Owner view — post auth
│   │   └── page.tsx
│   ├── api/
│   │   ├── bookings/         # Create, cancel bookings
│   │   │   └── route.ts
│   │   ├── things/           # Create, update things
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── stripe/       # Stripe billing events
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx              # Landing page
│
├── components/
│   ├── calendar/             # Booking calendar (from CalendarV23)
│   │   ├── Calendar.tsx
│   │   ├── Slot.tsx
│   │   └── Toast.tsx
│   ├── setup/                # Setup form (from SetupV1)
│   │   └── SetupForm.tsx
│   └── ui/                   # Shared primitives
│       ├── Pills.tsx
│       └── Modal.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   └── types.ts          # Generated DB types
│   ├── stripe/
│   │   └── client.ts
│   └── resend/
│       ├── client.ts
│       └── ics.ts            # ICS file generation
│
├── supabase/
│   └── migrations/           # DB schema migrations
│
├── types/
│   └── index.ts              # Shared app types
│
├── .env.example
├── .env.local                # Never committed
├── next.config.ts
├── railway.toml
└── Dockerfile
```

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/bookonething.git
cd bookonething
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see `.env.example` for required keys.

### 3. Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run migrations: `npx supabase db push`
- Copy your project URL and anon key into `.env.local`

### 4. Run locally

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## Key URLs

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/setup` | Owner creates a thing |
| `/dashboard` | Owner manages their things |
| `/:slug` | Public booking page — e.g. `/the-meeting-room` |

---

## MVP scope

The goal is to replace the meeting room booking system first.

**Phase 1 — Core**
- [ ] Supabase schema (things, bookings)
- [ ] Generalise CalendarV23 to be config-driven
- [ ] Wire SetupV1 to database
- [ ] Owner auth (magic link via Supabase)
- [ ] Booker name capture (localStorage, no account)
- [ ] Fairness rule enforcement (server-side)
- [ ] Email confirmations + ICS via Resend
- [ ] Stripe billing (free first thing, $10/mo each additional)
- [ ] Touch scroll disambiguation (tap vs scroll on mobile)

**Phase 2 — Polish**
- [ ] Landing page + waitlist
- [ ] Owner calendar view (all bookings visible)
- [ ] Owner settings — edit a thing
- [ ] Buffer visualisation in calendar
- [ ] Import upcoming bookings

**Not in V1**
- Google Calendar sync
- Multi-timezone support
- Recurring bookings
- Approval workflows
