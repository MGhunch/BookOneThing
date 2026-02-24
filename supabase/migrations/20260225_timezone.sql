-- Add timezone to things and pending_things
-- Stored as IANA timezone string e.g. "Pacific/Auckland"
-- Defaults to UTC so existing rows are safe

alter table public.things
  add column if not exists timezone text not null default 'UTC';

alter table public.pending_things
  add column if not exists timezone text not null default 'UTC';
