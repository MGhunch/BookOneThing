-- Book One Thing — booker sessions
-- Magic-link auth for bookers. No Supabase Auth needed — just a token table.

create table public.booker_sessions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  first_name  text not null,
  thing_id    uuid not null references public.things(id) on delete cascade,
  slug        text not null,          -- where to redirect after auth
  token       text not null unique,   -- random hex token in the magic link
  expires_at  timestamptz not null,   -- 1 hour from creation
  used_at     timestamptz,            -- set when the link is tapped
  created_at  timestamptz default now()
);

alter table public.booker_sessions enable row level security;

-- No RLS policies needed — this table is only ever touched by the service role key
-- (server actions + API routes). Bookers never query it directly.

-- Fast token lookup
create index booker_sessions_token_idx on public.booker_sessions(token);

-- Clean up expired sessions (run periodically or via a cron if needed)
-- For now, the auth callback simply rejects expired tokens.
