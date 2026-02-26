-- Book One Thing — auth model alignment
-- 1. Rename magic_codes → codewords (matches product language)
-- 2. Add org_slug to booker_sessions (scopes tokens per organisation)
-- 3. booker_sessions now written on codeword completion, not magic link click

-- ─── 1. Rename magic_codes → codewords ───────────────────────────────────────

alter table public.magic_codes rename to codewords;

-- Rename indexes to match
alter index if exists magic_codes_expires_at rename to codewords_expires_at_idx;
alter index if exists magic_codes_email_code rename to codewords_email_code_idx;

-- ─── 2. Scope booker_sessions per organisation ────────────────────────────────
-- org_slug ties a session to a specific owner/org.
-- A booker at Hunch and Harbour gets two separate sessions.

alter table public.booker_sessions
  add column if not exists org_slug text;

-- Unique constraint so upsert works correctly.
-- One row per person per thing per org — Sam appears once per thing she books.
alter table public.booker_sessions
  drop constraint if exists booker_sessions_email_org_slug_key;

alter table public.booker_sessions
  drop constraint if exists booker_sessions_email_thing_key;

alter table public.booker_sessions
  add constraint booker_sessions_email_thing_key
  unique (email, thing_id);

-- Index for fast org-scoped lookups (manage page sharers list)
create index if not exists booker_sessions_org_slug_idx
  on public.booker_sessions(org_slug);

-- ─── 3. Make booker_sessions writable on codeword completion ─────────────────
-- Previously only written by the magic link flow (now .bak'd).
-- Now written by setBookerSessionCookie after codeword verification.
-- token + expires_at + used_at are no longer needed — session is set by cookie.
-- We keep the columns nullable so existing rows don't break.

alter table public.booker_sessions
  alter column token drop not null;

alter table public.booker_sessions
  alter column expires_at drop not null;

-- Add a simple timestamp for when this session was established
alter table public.booker_sessions
  add column if not exists authenticated_at timestamptz default now();

-- ─── 4. Clean up ─────────────────────────────────────────────────────────────
-- booker_sessions.slug was used for redirect after magic link — no longer needed
-- but keep it nullable rather than drop (existing rows may have it populated)
alter table public.booker_sessions
  alter column slug drop not null;
