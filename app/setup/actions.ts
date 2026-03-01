"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendCodeword } from "@/app/codeword-actions";
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
  // Reuse slug if this email already has a profile
  const { data: existing } = await supabase
    .from("profiles")
    .select("slug")
    .eq("email", email)
    .single();
  if (existing?.slug) return existing.slug;

  // Also check pending_things in case they are mid-setup (no profile yet)
  const { data: pending } = await supabase
    .from("pending_things")
    .select("owner_slug")
    .eq("email", email)
    .not("owner_slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (pending?.owner_slug) return pending.owner_slug;

  // Generate a fresh unique slug
  const base = slugify(emailPrefix);
  while (true) {
    const slug = `${base}-${randomCode()}`;
    const { data: taken } = await supabase
      .from("profiles").select("id").eq("slug", slug).single();
    if (!taken) return slug;
  }
}

async function uniquePendingThingSlug(
  supabase:   ReturnType<typeof adminClient>,
  ownerSlug:  string,
  base:       string
): Promise<string> {
  let slug = base;
  let i    = 2;
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

// ─── SUBMIT SETUP ─────────────────────────────────────────────────────────────
// Writes to pending_things and fires a codeword email.
// The thing is NOT live yet — no auth user or profile created.
// activatePendingThing() does that once the codeword is verified.

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
  | { ok: true; ownerSlug: string; thingSlug: string }
  | { error: string };

export async function submitSetup(data: SetupFormData): Promise<SetupResult> {
  const supabase   = adminClient();
  const { start, end } = availTimes(data.avail, data.fromH, data.toH);
  const cleanEmail  = data.email.trim().toLowerCase();
  const firstName   = data.firstName.trim();
  const emailPrefix = cleanEmail.split("@")[0];

  // Generate slugs upfront — reuse owner slug if they already exist
  const ownerSlug = await getOrCreateOwnerSlug(supabase, cleanEmail, emailPrefix);
  const thingSlug = await uniquePendingThingSlug(supabase, ownerSlug, slugify(data.name));

  // Write to pending_things — not live yet, no owner identity bound
  const { error: insertErr } = await supabase
    .from("pending_things")
    .insert({
      email:           cleanEmail,
      first_name:      firstName,
      owner_slug:      ownerSlug,
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
    });

  if (insertErr) {
    console.error("pending_things insert failed:", insertErr);
    return { error: "Couldn't save your thing. Please try again." };
  }

  // Send codeword to prove inbox ownership
  const codeResult = await sendCodeword({
    context:   "setup",
    email:     cleanEmail,
    firstName,
    ownerSlug,
    thingSlug,
  });

  if ("error" in codeResult) {
    // Clean up the pending row so they can try again cleanly
    await supabase.from("pending_things")
      .delete()
      .eq("email", cleanEmail)
      .eq("owner_slug", ownerSlug)
      .eq("slug", thingSlug);
    return { error: codeResult.error };
  }

  return { ok: true, ownerSlug, thingSlug };
}

// ─── ACTIVATE PENDING THING ───────────────────────────────────────────────────
// Called after codeword is entered. Promotes pending_things → things.
// Creates auth user + profile, sets owner session cookie, sends welcome email.

export type ActivateResult =
  | { ok: true; url: string }
  | { error: string };

export async function activatePendingThing(
  email:     string,
  ownerSlug: string,
  thingSlug: string,
): Promise<ActivateResult> {
  const supabase   = adminClient();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Fetch the pending thing (must not be expired)
  const { data: pending, error: pendingErr } = await supabase
    .from("pending_things")
    .select("*")
    .eq("email", cleanEmail)
    .eq("owner_slug", ownerSlug)
    .eq("slug", thingSlug)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (pendingErr || !pending) {
    return { error: "Your setup link has expired. Please start over." };
  }

  // 2. Get or create auth user — inbox is proven by codeword, so confirm immediately
  let userId: string | null = null;

  const { data: created } = await supabase.auth.admin.createUser({
    email:         cleanEmail,
    email_confirm: true,
    user_metadata: { first_name: pending.first_name },
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    // Already exists — find via profiles then Auth directly
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const found = users.find((u) => u.email === cleanEmail);
      if (found) userId = found.id;
    }
  }

  if (!userId) {
    return { error: "Couldn't create your account. Please try again." };
  }

  // 3. Upsert profile
  await supabase.from("profiles").upsert({
    id:         userId,
    email:      cleanEmail,
    first_name: pending.first_name,
    slug:       ownerSlug,
  }, { onConflict: "id" });

  // 4. Ensure slug is unique in things (guard against duplicate attempts)
  let finalThingSlug = thingSlug;
  {
    let i = 2;
    while (true) {
      const { data } = await supabase
        .from("things").select("id")
        .eq("owner_id", userId)
        .eq("slug", finalThingSlug)
        .single();
      if (!data) break;
      finalThingSlug = `${thingSlug}-${i++}`;
    }
  }

  // 5. Insert into things — now it is live
  const { error: thingErr } = await supabase
    .from("things")
    .insert({
      owner_id:        userId,
      name:            pending.name,
      slug:            finalThingSlug,
      icon:            pending.icon,
      avail_start:     pending.avail_start,
      avail_end:       pending.avail_end,
      avail_weekends:  pending.avail_weekends,
      timezone:        pending.timezone,
      max_length_mins: pending.max_length_mins,
      book_ahead_days: pending.book_ahead_days,
      max_concurrent:  pending.max_concurrent,
      buffer_mins:     pending.buffer_mins,
      instructions:    pending.instructions,
      is_active:       true,
    });

  if (thingErr) {
    console.error("things insert failed:", thingErr);
    return { error: "Couldn't publish your thing. Please try again." };
  }

  // 6. Set owner session cookie (org-scoped, same mechanism as booker sessions)
  const cookieName = `bot_session_${ownerSlug}`;
  try {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, JSON.stringify({
      email: cleanEmail,
      firstName: pending.first_name,
      orgSlug: ownerSlug,
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });
  } catch (err) {
    // Non-fatal — they can re-auth via the padlock
    console.error("Owner cookie set failed (non-fatal):", err);
  }

  // 7. Clean up pending row
  await supabase.from("pending_things").delete().eq("id", pending.id);

  // 8. Send welcome email with the share URL
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookonething.com";
  const shareUrl = `${siteUrl}/${ownerSlug}/${finalThingSlug}`;

  try {
    await sendOwnerWelcome({
      firstName:     pending.first_name,
      toEmail:       cleanEmail,
      thingName:     pending.name,
      shareUrl,
      availStart:    pending.avail_start,
      availEnd:      pending.avail_end,
      availWeekends: pending.avail_weekends,
      maxLengthMins: pending.max_length_mins,
      bookAheadDays: pending.book_ahead_days,
      maxConcurrent: pending.max_concurrent,
    });
  } catch (err) {
    console.error("Owner welcome email failed (non-fatal):", err);
  }

  return { ok: true, url: shareUrl };
}
