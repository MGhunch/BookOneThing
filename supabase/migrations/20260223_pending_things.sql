-- Pending things — created before the owner has clicked their magic link.
-- Once they authenticate, the callback moves this into the things table.

create table public.pending_things (
  id              uuid primary key default gen_random_uuid(),
  token           uuid not null default gen_random_uuid(), -- ties to the magic link session
  email           text not null,
  first_name      text not null,
  name            text not null,
  slug            text not null,
  icon            text not null default 'car',
  avail_start     time not null default '09:00',
  avail_end       time not null default '17:00',
  avail_weekends  boolean not null default false,
  max_length_mins integer not null default 120,
  book_ahead_days integer not null default 30,
  max_concurrent  integer not null default 3,
  buffer_mins     integer not null default 0,
  instructions    text,
  created_at      timestamptz default now(),
  expires_at      timestamptz default now() + interval '1 hour'
);

-- No RLS needed — only touched by server-side code with service role key.
-- Clean up expired rows nightly (can add a pg_cron job later).
create index pending_things_email_idx on public.pending_things(email);
create index pending_things_token_idx on public.pending_things(token);
