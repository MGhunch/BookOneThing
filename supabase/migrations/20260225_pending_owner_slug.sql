-- Add owner_slug to pending_things.
-- Generated at setup time so we can build the calendar URL immediately
-- before the owner has authenticated. Same format as profiles.slug.
-- e.g. "harbour-works-k7n2"

alter table public.pending_things
  add column if not exists owner_slug text;
