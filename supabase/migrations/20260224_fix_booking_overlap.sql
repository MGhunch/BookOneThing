-- Fix double-booking prevention.
-- The original unique index on (thing_id, starts_at, ends_at) only blocks
-- exact duplicate rows. Two bookings with overlapping ranges (e.g. 2pm–3pm
-- and 2:30pm–3:30pm) would both pass. This replaces it with a proper
-- exclusion constraint using tstzrange so any overlap is rejected at the DB level.

-- Requires btree_gist extension for mixed-type exclusion constraints
create extension if not exists btree_gist;

-- Drop the broken index
drop index if exists public.bookings_no_overlap_idx;

-- Add the correct exclusion constraint.
-- Rejects any two active bookings for the same thing whose time ranges touch or overlap.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    thing_id   with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (cancelled_at is null);
