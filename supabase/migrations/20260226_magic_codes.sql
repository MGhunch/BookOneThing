-- magic_codes
-- Stores short-lived codewords for passwordless auth.
-- Used for both booker gate and owner manage page.
-- Replaces magic links entirely.

create table if not exists public.magic_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code        text not null,
  context     text not null,  -- 'booker' | 'manage'
  thing_id    uuid references public.things(id) on delete cascade,
  owner_slug  text,
  thing_slug  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '15 minutes'),
  used_at     timestamptz
);

-- Only the service role touches this table
alter table public.magic_codes enable row level security;

create policy "Service role only"
  on public.magic_codes
  using (false);

-- Auto-clean expired codes nightly
create index if not exists magic_codes_expires_at on public.magic_codes (expires_at);
create index if not exists magic_codes_email_code on public.magic_codes (email, code);
