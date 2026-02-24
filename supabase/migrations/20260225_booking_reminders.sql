alter table public.bookings
  add column if not exists cancel_token uuid not null default gen_random_uuid(),
  add column if not exists reminder_opt_in boolean not null default false,
  add column if not exists reminder_note text,
  add column if not exists reminder_sent_at timestamptz;

create unique index if not exists bookings_cancel_token_idx on public.bookings(cancel_token);
