-- Book One Thing — owner slugs + scoped thing slugs
--
-- Changes:
--   1. profiles gets a slug column (e.g. "harbour-works-k7n2")
--      URL: bookonething.com/:owner-slug/:thing-slug
--   2. things.slug uniqueness changes from globally unique
--      to unique per owner — "car-park-1" can exist for multiple owners.

-- 1. Add slug to profiles
alter table public.profiles
  add column if not exists slug text unique;

create index if not exists profiles_slug_idx on public.profiles(slug);

-- 2. Drop the global unique constraint on things.slug
--    and replace with a per-owner unique constraint.
alter table public.things
  drop constraint if exists things_slug_key;

drop index if exists things_slug_idx;

create unique index things_owner_slug_idx
  on public.things(owner_id, slug);
