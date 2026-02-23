-- Add missing columns to profiles.
-- first_name: used in emails and the owner dashboard greeting.
-- org_name: shown on the booker calendar under the thing name.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists org_name   text;
