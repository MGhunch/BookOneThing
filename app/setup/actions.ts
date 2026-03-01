"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendOwnerWelcome } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── MAPPING HELPERS ──────────────────────────────────────────────────────────

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
  if (avail === "9-5") return { start: "09:00", end: "17:00" };
  if (avail === "24")  return { start: "00:00", end: "23:30" };
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return { start: fmt(fromH), end: fmt(toH) };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

// ─── SLUG HELPERS ─────────────────────────────────────────────────────────────

async function getOrCreateOwnerSlug(
  supabase:    ReturnType<typeof adminClient>,
  email:       string,
  emailPrefix: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("slug")
    .eq("email", email)
    .single();
  if (existing?.slug) return existing.slug;

  const base = slugify(emailPrefix);
  while (true) {
    const slug = `${base}-${randomCode()}`;
    const { data: taken } = await supabase
      .from("profiles").select("id").eq("slug", slug).single();
    if (!taken) return slug;
  }
}

async function uniqueThingSlug(
  supabase:  ReturnType<typeof adminClient>,
  ownerId:   string,
  base:      string
): Promise<string> {
  let slug = base;
  let i    = 2;
  while (true) {
    const { data } = await supabase
      .from("things").select("id")
      .eq("owner_id", ownerId)
      .eq("slug", slug)
      .single();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

// ─── CREATE THING ─────────────────────────────────────────────────────────────
// Called after codeword is verified. Inbox is proven — create everything now.
// No pending state. No two-step. Just: verified → live.

export type CreateThingData = {
  // Form data
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
  // Identity — from BookerGate
  email:      string;
  firstName:  string;
  orgName:    string;
};

export type CreateThingResult =
  | { ok: true; url: string }
  | { error: string };

export async function createThing(data: CreateThingData): Promise<CreateThingResult> {
  const supabase    = adminClient();
  const { start, end } = availTimes(data.avail, data.fromH, data.toH);
  const cleanEmail  = data.email.trim().toLowerCase();
  const firstName   = data.firstName.trim();
  const emailPrefix = cleanEmail.split("@")[0];

  // 1. Get or create auth user
  let userId: string | null = null;

  const { data: created } = await supabase.auth.admin.createUser({
    email:         cleanEmail,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: existingProfile } = await supabase
      .from("profiles").select("id").eq("email", cleanEmail).single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const found = users.find(u => u.email === cleanEmail);
      if (found) userId = found.id;
    }
  }

  if (!userId) return { error: "Couldn't create your account. Please try again." };

  // 2. Upsert profile
  const ownerSlug = await getOrCreateOwnerSlug(supabase, cleanEmail, emailPrefix);

  await supabase.from("profiles").upsert({
    id:         userId,
    email:      cleanEmail,
    first_name: firstName,
    slug:       ownerSlug,
    org_name:   data.orgName.trim() || null,
  }, { onConflict: "id" });

  // 3. Insert thing — live immediately
  const thingSlug = await uniqueThingSlug(supabase, userId, slugify(data.name));

  const { error: thingErr } = await supabase.from("things").insert({
    owner_id:        userId,
    name:            data.name.trim(),
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
    is_active:       true,
  });

  if (thingErr) {
    console.error("things insert failed:", thingErr);
    return { error: "Couldn't create your thing. Please try again." };
  }

  // 4. Set owner session cookie
  const cookieName = `bot_session_${ownerSlug}`;
  try {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, JSON.stringify({
      email: cleanEmail, firstName, orgSlug: ownerSlug,
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });
  } catch (err) {
    console.error("Owner cookie set failed (non-fatal):", err);
  }

  // 5. Send welcome email
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookonething.com";
  const shareUrl = `${siteUrl}/${ownerSlug}/${thingSlug}`;

  try {
    sendOwnerWelcome({
      firstName,
      toEmail:       cleanEmail,
      thingName:     data.name.trim(),
      shareUrl,
      availStart:    start,
      availEnd:      end,
      availWeekends: data.weekends,
      maxLengthMins: maxLengthMins(data.maxLen),
      bookAheadDays: bookAheadDays(data.ahead),
      maxConcurrent: maxConcurrent(data.concurrent),
    });
  } catch (err) {
    console.error("Owner welcome email failed (non-fatal):", err);
  }

  return { ok: true, url: shareUrl };
}
