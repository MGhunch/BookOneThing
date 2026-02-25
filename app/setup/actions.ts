"use server";

import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function maxLengthMins(key: string): number {
  const map: Record<string, number> = {
    "30": 30, "120": 120, "hd": 240, "fd": 480, "none": 99999,
  };
  return map[key] ?? 120;
}

function bookAheadDays(key: string): number {
  const map: Record<string, number> = {
    "1": 30, "3": 90, "6": 180, "12": 365, "none": 99999,
  };
  return map[key] ?? 30;
}

function maxConcurrent(key: string): number {
  const map: Record<string, number> = {
    "3": 3, "5": 5, "10": 10, "none": 99999,
  };
  return map[key] ?? 3;
}

function bufferMins(key: string): number {
  return parseInt(key) || 0;
}

function availTimes(avail: string, fromH: number, toH: number) {
  if (avail === "9-5")  return { start: "09:00", end: "17:00" };
  if (avail === "24")   return { start: "00:00", end: "23:30" };
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return { start: fmt(fromH), end: fmt(toH) };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

async function uniqueOwnerSlug(
  supabase: ReturnType<typeof adminClient>,
  emailPrefix: string
): Promise<string> {
  const base = slugify(emailPrefix);
  while (true) {
    const slug = `${base}-${randomCode()}`;
    const [{ data: profile }, { data: pending }] = await Promise.all([
      supabase.from("profiles").select("id").eq("slug", slug).single(),
      supabase.from("pending_things").select("id").eq("owner_slug", slug).single(),
    ]);
    if (!profile && !pending) return slug;
  }
}

async function uniqueThingSlug(
  supabase: ReturnType<typeof adminClient>,
  ownerSlug: string,
  base: string
): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase
      .from("pending_things")
      .select("id")
      .eq("owner_slug", ownerSlug)
      .eq("slug", slug)
      .single();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

export type SetupFormData = {
  name:       string;
  icon:       string;
  avail:      string;
  fromH:      number;
  toH:        number;
  weekends:   boolean;
  timezone:   string;
  notes:      string;
  maxLen:     string;
  ahead:      string;
  concurrent: string;
  buffer:     string;
  email:      string;
  firstName:  string;
};

export type SetupResult =
  | { ok: true; url: string }
  | { error: string };

export async function submitSetup(data: SetupFormData): Promise<SetupResult> {
  const supabase = adminClient();
  const { start, end } = availTimes(data.avail, data.fromH, data.toH);

  const emailPrefix = data.email.trim().toLowerCase().split("@")[0];
  const ownerSlug   = await uniqueOwnerSlug(supabase, emailPrefix);
  const thingSlug   = await uniqueThingSlug(supabase, ownerSlug, slugify(data.name));

  const { data: pending, error: pendingError } = await supabase
    .from("pending_things")
    .insert({
      email:           data.email.trim().toLowerCase(),
      first_name:      data.firstName.trim(),
      name:            data.name.trim(),
      owner_slug:      ownerSlug,
      slug:            thingSlug,
      icon:            data.icon || "car",
      avail_start:     start,
      avail_end:       end,
      avail_weekends:  data.weekends,
      timezone:        data.timezone || "UTC",
      max_length_mins: maxLengthMins(data.maxLen),
      book_ahead_days: bookAheadDays(data.ahead),
      max_concurrent:  maxConcurrent(data.concurrent),
      buffer_mins:     bufferMins(data.buffer),
      instructions:    data.notes.trim() || null,
    })
    .select("token")
    .single();

  if (pendingError || !pending) {
    console.error("Pending insert failed:", pendingError);
    return { error: "Something went wrong. Please try again." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookonething.com";
  const calUrl  = `${siteUrl}/${ownerSlug}/${thingSlug}`;

  // Send the codeword email immediately so it's in their inbox
  // when they land on the pending calendar. 60-minute expiry gives
  // them time to get there without feeling rushed.
  const { sendCodeword } = await import("@/app/codeword-actions");
  const codeResult = await sendCodeword({
    context:       "setup",
    email:         data.email.trim().toLowerCase(),
    firstName:     data.firstName.trim(),
    ownerSlug,
    thingSlug,
    expiryMinutes: 60,
  });

  if ("error" in codeResult) {
    console.error("Codeword send failed:", codeResult.error);
    return { error: "Couldn't send your codeword. Please try again." };
  }

  return { ok: true, url: calUrl };
}
