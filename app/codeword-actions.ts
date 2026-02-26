"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomCodeword } from "@/lib/codewords";
import { sendCodewordEmail, sendOwnerWelcome } from "@/lib/email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SESSION_COOKIE = "bot_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// ─── SEND CODEWORD ────────────────────────────────────────────────────────────

export type SendCodewordArgs =
  | { context: "manage";  email: string; firstName?: string; expiryMinutes?: number }
  | { context: "booker";  email: string; firstName?: string; expiryMinutes?: number; thingId: string; thingName: string; ownerSlug: string; thingSlug: string }
  | { context: "setup";   email: string; firstName?: string; expiryMinutes?: number; ownerSlug: string; thingSlug: string };

export type SendCodewordResult = { ok: true } | { error: string };

export async function sendCodeword(args: SendCodewordArgs): Promise<SendCodewordResult> {
  const supabase   = adminClient();
  const code       = randomCodeword();
  const email      = args.email.trim().toLowerCase();
  const expiryMins = args.expiryMinutes ?? 15;

  await supabase
    .from("magic_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("email", email)
    .eq("context", args.context)
    .is("used_at", null);

  const row: Record<string, unknown> = {
    email,
    code,
    context:    args.context,
    expires_at: new Date(Date.now() + expiryMins * 60 * 1000).toISOString(),
  };

  if (args.context === "booker") {
    row.thing_id   = args.thingId;
    row.owner_slug = args.ownerSlug;
    row.thing_slug = args.thingSlug;
  }
  if (args.context === "setup") {
    row.owner_slug = args.ownerSlug;
    row.thing_slug = args.thingSlug;
  }

  const { error: insertError } = await supabase.from("magic_codes").insert(row);
  if (insertError) {
    console.error("magic_codes insert failed:", insertError);
    return { error: "Something went wrong. Please try again." };
  }

  try {
    await sendCodewordEmail({
      toEmail:   email,
      firstName: args.firstName,
      code,
      context:   args.context,
      thingName: args.context === "booker" ? args.thingName : undefined,
    });
  } catch (err) {
    console.error("Codeword email failed:", err);
    return { error: "Couldn't send the email. Please try again." };
  }

  return { ok: true };
}

// ─── VERIFY CODEWORD ──────────────────────────────────────────────────────────

export type VerifyCodewordArgs  = { email: string; code: string; context: "booker" | "manage" | "setup" };
export type VerifyCodewordResult = { ok: true; thingId?: string; ownerSlug?: string; thingSlug?: string } | { error: string };

export async function verifyCodeword(args: VerifyCodewordArgs): Promise<VerifyCodewordResult> {
  const supabase = adminClient();
  const email    = args.email.trim().toLowerCase();
  const code     = args.code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("magic_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("context", args.context)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return { error: "That codeword isn't right. Try again." };

  await supabase
    .from("magic_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok:        true,
    thingId:   data.thing_id   ?? undefined,
    ownerSlug: data.owner_slug ?? undefined,
    thingSlug: data.thing_slug ?? undefined,
  };
}

// ─── ACTIVATE PENDING THING — Bug 1 fix ───────────────────────────────────────
// Called by SetupGate after codeword verification.
// Does everything callback/route.ts used to do — without a magic link.

export type ActivateResult = { ok: true; shareUrl: string } | { error: string };

export async function activatePendingThing(
  email:     string,
  ownerSlug: string,
  thingSlug: string
): Promise<ActivateResult> {
  const supabase   = adminClient();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Find the pending thing
  const { data: pending, error: pendingErr } = await supabase
    .from("pending_things")
    .select("*")
    .eq("owner_slug", ownerSlug)
    .eq("slug",       thingSlug)
    .eq("email",      cleanEmail)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (pendingErr || !pending) {
    console.error("Pending thing not found:", pendingErr);
    return { error: "Couldn't find your thing. It may have expired — please set up again." };
  }

  // 2. Get or create the Supabase auth user
  let userId: string | null = null;

  const { data: created } = await supabase.auth.admin.createUser({
    email:         cleanEmail,
    email_confirm: true,
    user_metadata: { first_name: pending.first_name },
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    // User already exists — find via profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .single();
    if (existingProfile) userId = existingProfile.id;
  }

  if (!userId) return { error: "Couldn't create your account. Please try again." };

  // 3. Upsert profile — preserve existing slug if owner already has one
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("slug")
    .eq("id", userId)
    .single();

  await supabase.from("profiles").upsert({
    id:         userId,
    email:      cleanEmail,
    first_name: pending.first_name,
    slug:       existingProfile?.slug ?? ownerSlug,
  }, { onConflict: "id" });

  // 4. Create the real thing
  const finalSlug = await uniqueThingSlug(supabase, userId, pending.slug);

  const { data: thing, error: thingErr } = await supabase
    .from("things")
    .insert({
      owner_id:        userId,
      name:            pending.name,
      slug:            finalSlug,
      icon:            pending.icon,
      avail_start:     pending.avail_start,
      avail_end:       pending.avail_end,
      avail_weekends:  pending.avail_weekends,
      timezone:        pending.timezone ?? "UTC",
      max_length_mins: pending.max_length_mins,
      book_ahead_days: pending.book_ahead_days,
      max_concurrent:  pending.max_concurrent,
      buffer_mins:     pending.buffer_mins,
      instructions:    pending.instructions,
      is_active:       true,
    })
    .select("slug")
    .single();

  if (thingErr || !thing) {
    console.error("Thing creation failed:", thingErr);
    return { error: "Couldn't activate your thing. Please try again." };
  }

  // 5. Clean up the pending row
  await supabase.from("pending_things").delete().eq("id", pending.id);

  // 6. Send owner welcome email (non-blocking)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookonething.com";
  try {
    await sendOwnerWelcome({
      firstName:     pending.first_name,
      toEmail:       cleanEmail,
      thingName:     pending.name,
      shareUrl:      `${siteUrl}/${ownerSlug}/${thing.slug}`,
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

  return { ok: true, shareUrl: `${siteUrl}/${ownerSlug}/${thing.slug}` };
}

// ─── SET BOOKER SESSION COOKIE — Bug 3 fix ────────────────────────────────────
// Called by BookerGate after codeword + name are confirmed.
// Sets the bot_session cookie so the calendar knows who this person is.

export type SetBookerSessionResult = { ok: true } | { error: string };

export async function setBookerSessionCookie(
  email:     string,
  firstName: string,
): Promise<SetBookerSessionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, JSON.stringify({ email, firstName }), {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
    });
    return { ok: true };
  } catch (err) {
    console.error("Cookie set failed:", err);
    return { error: "Couldn't save your session." };
  }
}

// ─── LOAD OWNER DATA — Bug 2 fix ─────────────────────────────────────────────
// Called by the manage page after codeword verification.
// Loads profile + things by email — no Supabase session needed.

export type OwnerData = {
  profile: { slug: string; first_name: string | null; org_name: string | null } | null;
  things:  Array<{
    id: string; name: string; slug: string; icon: string;
    avail_start: string; avail_end: string; avail_weekends: boolean;
    max_length_mins: number; book_ahead_days: number;
    max_concurrent: number; buffer_mins: number;
  }>;
};

export async function loadOwnerData(email: string): Promise<OwnerData> {
  const supabase   = adminClient();
  const cleanEmail = email.trim().toLowerCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug, first_name, org_name")
    .eq("email", cleanEmail)
    .single();

  if (!profile) return { profile: null, things: [] };

  const { data: things } = await supabase
    .from("things")
    .select("id, name, slug, icon, avail_start, avail_end, avail_weekends, max_length_mins, book_ahead_days, max_concurrent, buffer_mins")
    .eq("owner_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return {
    profile: { slug: profile.slug, first_name: profile.first_name, org_name: profile.org_name },
    things:  things ?? [],
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function uniqueThingSlug(
  supabase: ReturnType<typeof adminClient>,
  ownerId:  string,
  base:     string
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
