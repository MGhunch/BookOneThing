-- Book One Thing — initial schema
-- Run via: npx supabase db push

-- ─── OWNERS ───────────────────────────────────────────────────────────────────
-- Handled by Supabase Auth. The auth.users table is created automatically.
-- We extend it with a profiles table for any extra owner data.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Owners can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);


-- ─── THINGS ───────────────────────────────────────────────────────────────────

create table public.things (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  slug            text not null unique,                  -- URL: bookonething.com/:slug
  icon            text not null default 'car',           -- Lucide icon name
  avail_start     time not null default '09:00',         -- Availability window start
  avail_end       time not null default '17:00',         -- Availability window end
  avail_weekends  boolean not null default false,
  max_length_mins integer not null default 120,          -- Max booking length in minutes
  book_ahead_days integer not null default 14,           -- How far ahead bookings can be made
  max_concurrent  integer not null default 2,            -- Max future bookings per person
  buffer_mins     integer not null default 0,            -- Buffer between bookings
  instructions    text,                                  -- Optional notes shown to bookers
  is_active       boolean not null default true,
  created_at      timestamptz default now()
);

alter table public.things enable row level security;

create policy "Owners can manage their own things"
  on public.things for all
  using (auth.uid() = owner_id);

create policy "Anyone can read active things"
  on public.things for select
  using (is_active = true);

-- Slug index for fast public lookups
create index things_slug_idx on public.things(slug);


-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  thing_id        uuid not null references public.things(id) on delete cascade,
  booker_name     text not null,
  booker_email    text,                                  -- Optional — for ICS receipt
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  cancelled_at    timestamptz,                           -- Null = active booking
  created_at      timestamptz default now(),

  constraint bookings_end_after_start check (ends_at > starts_at)
);

alter table public.bookings enable row level security;

create policy "Anyone can create bookings"
  on public.bookings for insert
  with check (true);

create policy "Anyone can read active bookings"
  on public.bookings for select
  using (cancelled_at is null);

create policy "Owners can see all bookings for their things"
  on public.bookings for select
  using (
    exists (
      select 1 from public.things
      where things.id = bookings.thing_id
      and things.owner_id = auth.uid()
    )
  );

-- Prevent double bookings at the DB level
-- Two bookings conflict if their time ranges overlap and neither is cancelled
create unique index bookings_no_overlap_idx
  on public.bookings (thing_id, starts_at, ends_at)
  where cancelled_at is null;

-- Fast lookups by thing + date range
create index bookings_thing_time_idx on public.bookings(thing_id, starts_at, ends_at);


-- ─── BILLING ──────────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id    text,
  stripe_subscription_id text,
  status                text,                            -- active, cancelled, past_due
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Owners can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = owner_id);
